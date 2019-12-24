import {
  __,
  always,
  any,
  apply,
  applySpec,
  assoc,
  both,
  complement,
  contains,
  dissocPath,
  either,
  equals,
  find,
  flatten,
  groupBy,
  has,
  head,
  identity,
  ifElse,
  is,
  isEmpty,
  isNil,
  juxt,
  last,
  lensPath,
  map,
  mergeAll,
  mergeWithKey,
  objOf,
  path,
  pathEq,
  pathOr,
  pick,
  pipe,
  pluck,
  prop,
  propEq,
  propOr,
  props,
  propSatisfies,
  reduce,
  reject,
  reverse,
  set,
  sort,
  subtract,
  sum,
  unless,
  values,
  when,
} from 'ramda'
import moment from 'moment-timezone'
import isReprocessable from './isReprocessable'
import isRefundable from './isRefundable'
import isCapturable from './isCapturable'
import { transactionSpec } from '../shared'

const isNilOrEmpty = either(isNil, isEmpty)

const sortByCreatedAt = sort((left, right) => {
  if (has('created_at', right)) {
    return moment(right.created_at)
      .diff(moment(left.created_at), 'milliseconds')
  }

  return moment(right.date_created)
    .diff(moment(left.date_created), 'milliseconds')
})

const normalizeChargebackOps = pipe(
  groupBy(prop('type')),
  map(pipe(
    groupBy(prop('cycle')),
    map(pipe(sortByCreatedAt, head))
  )),
  values,
  map(values),
  flatten
)

const findPreviousOperation = (groupId, operations) => (
  find(propEq('next_group_id', groupId), operations)
)

const sortGatewayOperations = (operations) => {
  const lastOperation = operations.find(propEq('next_group_id', null))
  let list = lastOperation
    ? [lastOperation]
    : []

  operations.forEach(() => {
    const operation = findPreviousOperation(head(list).group_id, operations)

    if (operation) {
      list = [operation, ...list]
    }
  })

  return list
}

const operationsTypesBlackList = ['conciliate']
const operationsStatusBlackList = ['dropped', 'waiting']

const rejectInvalidOperations = reject(either(
  propSatisfies(contains(__, operationsTypesBlackList), 'type'),
  propSatisfies(contains(__, operationsStatusBlackList), 'status')
))

const manualReviewTimeout = both(
  propEq('status', 'refused'),
  propEq('refuse_reason', 'manual_review_timeout')
)

const getStatus = (transaction, manualReviewAnalysis) => {
  if (transaction.status === 'pending_review') {
    return 'pending'
  }

  if (manualReviewTimeout(transaction)) {
    return 'timeout'
  }

  return manualReviewAnalysis.status
}

const nameEqualPagarme = propEq('name', 'pagarme')
const hasPagarmeAntifraudAnalysis = any(nameEqualPagarme)

const findPagarmeAntifraudAnalysis = find(nameEqualPagarme)

const getAntifraudAnalysis = ifElse(
  hasPagarmeAntifraudAnalysis,
  findPagarmeAntifraudAnalysis,
  head
)

const buildCreditCardOperations = ({
  antifraudAnalyses,
  chargebackOperations,
  gatewayOperations,
  transaction,
}) => {
  const sortedGatewayOps = sortGatewayOperations(gatewayOperations)
  const filteredGatewayOps = rejectInvalidOperations(sortedGatewayOps)
  const normalizedChargebackOps = normalizeChargebackOps(chargebackOperations)

  const addAntifraudOperations = (operations, operation) => {
    if (operation.type !== 'analyze') {
      return operations.concat([operation])
    }

    const manualReviewAnalysis = find(
      propEq('name', 'manual_review'),
      antifraudAnalyses
    )

    const hasManualReview =
      transaction.status === 'pending_review' ||
      manualReviewTimeout(transaction) ||
      manualReviewAnalysis

    const analysis = getAntifraudAnalysis(antifraudAnalyses)

    const antifraudOperation = {
      created_at: operation.date_created,
      id: operation.id,
      status: analysis.status,
      type: operation.type,
    }

    if (hasManualReview) {
      const manualReviewOperation = {
        created_at: operation.date_updated,
        id: operation.id,
        status: getStatus(transaction, manualReviewAnalysis),
        type: 'manual_review',
      }

      return operations.concat([antifraudOperation, manualReviewOperation])
    }

    return operations.concat([antifraudOperation])
  }

  return filteredGatewayOps
    .reduce(addAntifraudOperations, [])
    .concat(normalizedChargebackOps)
}

const chooseOperations = pipe(
  ifElse(
    pathEq(['transaction', 'payment_method'], 'boleto'),
    pipe(prop('gatewayOperations'), sortGatewayOperations),
    buildCreditCardOperations
  ),
  reverse
)

const createOperationObj = applySpec({
  id: prop('id'),
  created_at: pipe(
    ifElse(
      has('date_created'),
      prop('date_created'),
      prop('created_at')
    ),
    unless(isNil, moment)
  ),
  type: prop('type'),
  status: ifElse(
    has('status'),
    prop('status'),
    always('success')
  ),
  cycle: propOr(null, 'cycle'),
})

const buildOperations = applySpec({
  operations: pipe(
    chooseOperations,
    map(createOperationObj)
  ),
})

const sumInstallmentsAmount = pipe(
  prop('installments'),
  pluck('amount'),
  sum
)

const sumAllPayableFees = pipe(props(['fee', 'anticipation_fee']), sum)
const payablesAllFeesTotalAmount = pipe(
  map(sumAllPayableFees),
  sum
)

const sumInstallmentsCostAmount = pipe(
  prop('installments'),
  payablesAllFeesTotalAmount
)

const mergeInstallment = (key, left, right) => {
  switch (key) {
    case 'amount':
    case 'net_amount':
    case 'mdr':
    case 'anticipation':
      return left + right
    default:
      break
  }

  if (is(moment, right) && is(moment, left)) {
    return right
  }

  if (is(Array, left) && is(Array, right)) {
    return right
  }

  if (is(Object, left) && is(Object, right)) {
    return mergeWithKey(mergeInstallment, left, right)
  }

  return right
}

const aggregateInstallments = (acc, installment) => (
  mergeWithKey(mergeInstallment, acc, installment)
)

const mapRecipients = map(applySpec({
  amount: sumInstallmentsAmount,
  created_at: prop('date_created'),
  id: prop('recipient_id'),
  charge_remainder: prop('charge_remainder'),
  installments: pipe(
    prop('installments'),
    map(applySpec({
      number: prop('installment'),
      status: prop('status'),
      payment_date: pipe(
        prop('payment_date'),
        unless(isNil, moment)
      ),
      original_payment_date: pipe(
        prop('original_payment_date'),
        unless(isNil, moment)
      ),
      created_at: pipe(
        prop('date_created'),
        unless(isNil, moment)
      ),
      amount: prop('amount'),
      net_amount: pipe(
        juxt([prop('amount'), sumAllPayableFees]),
        apply(subtract)
      ),
      costs: {
        mdr: prop('fee'),
        anticipation: prop('anticipation_fee'),
        taxes: pipe(
          props(['fee', 'fraud_coverage_fee']),
          values,
          sum
        ),
      },
    })),
    groupBy(prop('number')),
    map(sortByCreatedAt),
    map(reduce(aggregateInstallments, {})),
    values,
    reverse
  ),
  liabilities: pipe(
    juxt([
      ifElse(
        propEq('charge_processing_fee', true),
        always('mdr'),
        always(null)
      ),
      ifElse(
        propEq('liable', true),
        always('chargeback'),
        always(null)
      ),
    ]),
    reject(isNil)
  ),
  name: path(['recipient', 'bank_account', 'legal_name']),
  net_amount: pipe(
    juxt([
      sumInstallmentsAmount,
      sumInstallmentsCostAmount,
    ]),
    apply(subtract)
  ),
  percentage: pipe(prop('percentage'), String),
  split_rule_id: prop('id'),
  status: pipe(
    prop('installments'),
    sortByCreatedAt,
    last,
    prop('status')
  ),
  updated_at: prop('date_updated'),
}))

const buildRecipients = applySpec({
  recipients: unless(isEmpty, mapRecipients),
})

const hasSplitRules = propSatisfies(complement(isEmpty), 'split_rules')

const groupInstallments = ({ payables, split_rules: splitRules }) => splitRules
  .map(rule => ({
    ...rule,
    installments: payables.filter(propEq('split_rule_id', rule.id)),
  }))

const buildNewSplitRules = when(
  hasSplitRules,
  pipe(
    juxt([groupInstallments, identity]),
    apply(assoc('split_rules'))
  )
)

const buildReasonCode = pipe(
  ifElse(
    isNilOrEmpty,
    always(null),
    pipe(
      last,
      prop('reason_code')
    )
  ),
  objOf('reason_code')
)

const getOriginalId = either(
  path(['reprocessed', 'original_transaction_id']),
  pathOr(null, ['transaction', 'metadata', 'pagarme_original_transaction_id'])
)

const getReprocessedId = pathOr(null, ['reprocessed', 'id'])

const getReprocessedTransactionIds = relatedIdGetter => juxt([
  relatedIdGetter,
  path(['transaction', 'id']),
])

const getRelatedTransactionId = relatedIdGetter => pipe(
  getReprocessedTransactionIds(relatedIdGetter),
  ifElse(
    apply(equals),
    always(null),
    head
  )
)

const buildReprocessIds = applySpec({
  nextId: getRelatedTransactionId(getReprocessedId),
  previousId: getRelatedTransactionId(getOriginalId),
})

const buildCapabilities = ({ reprocessed, transaction }) => ({
  capabilities: {
    capturable: isCapturable(transaction),
    refundable: isRefundable(transaction),
    reprocessable: isReprocessable(transaction, reprocessed),
  },
})

const mapTransactionToResult = applySpec({
  transaction: pipe(
    juxt([
      pipe(prop('transaction'), applySpec(transactionSpec)),
      pipe(
        pick([
          'gatewayOperations',
          'chargebackOperations',
          'antifraudAnalyses',
          'transaction',
        ]),
        buildOperations
      ),
      buildCapabilities,
      buildReprocessIds,
      pipe(prop('split_rules'), buildRecipients),
      pipe(prop('chargebackOperations'), buildReasonCode),
      pick(['capabilities']),
      pick(['payables']),
    ]),
    mergeAll
  ),
})

const mdrLens = lensPath(['transaction', 'payment', 'mdr_amount'])

const sumInstallmentsMdrCost = pipe(
  prop('installments'),
  map(path(['costs', 'mdr'])),
  sum
)

const sumAllRecipientsMdrCost = pipe(
  path(['transaction', 'recipients']),
  map(sumInstallmentsMdrCost),
  sum
)

const fraudCoverageAmountLens = lensPath(['transaction', 'payment', 'fraud_coverage_amount'])

const sumAllRecipientsFraudCoverageFee = pipe(
  path(['transaction', 'payables']),
  pluck('fraud_coverage_fee'),
  sum,
  when(
    isNil,
    always(0)
  )
)

const netAmountLens = lensPath(['transaction', 'payment', 'net_amount'])

const subtractMdrFromNetAmount = pipe(
  path(['transaction', 'payment']),
  props(['net_amount', 'mdr_amount']),
  apply(subtract)
)

export default pipe(
  buildNewSplitRules,
  mapTransactionToResult,
  juxt([sumAllRecipientsMdrCost, identity]),
  apply(set(mdrLens)),
  juxt([subtractMdrFromNetAmount, identity]),
  apply(set(netAmountLens)),
  juxt([sumAllRecipientsFraudCoverageFee, identity]),
  apply(set(fraudCoverageAmountLens)),
  dissocPath(['transaction', 'payables'])
)
