/* eslint-disable camelcase */
import React, { Component } from 'react'
import PropTypes from 'prop-types'
import moment from 'moment-timezone'
import {
  always,
  applySpec,
  anyPass,
  both,
  contains,
  either,
  equals,
  flatten,
  head,
  ifElse,
  isEmpty,
  isNil,
  juxt,
  map,
  negate,
  path,
  pipe,
  prop,
  propEq,
  reject,
  sum,
  unless,
  when,
} from 'ramda'
import {
  Alert,
  Card,
  CardContent,
  CardTitle,
  Col,
  Grid,
  Legend,
  Row,
  Truncate,
} from 'former-kit'
import IconInfo from 'emblematic-icons/svg/Info32.svg'
import IconCheck from 'emblematic-icons/svg/Check24.svg'
import IconClearClose from 'emblematic-icons/svg/ClearClose24.svg'
import DownloadIcon from 'emblematic-icons/svg/Download24.svg'
import IconReverse from 'emblematic-icons/svg/Reverse24.svg'
import CaptureIcon from 'emblematic-icons/svg/Wallet24.svg'
import ReprocessIcon from 'emblematic-icons/svg/Reprocess24.svg'
import currencyFormatter from '../../formatters/currency'
import CustomerCard from '../../components/CustomerCard'
import decimalCurrencyFormatter from '../../formatters/decimalCurrency'
import DetailsHead from '../../components/DetailsHead'
import RecipientList from '../RecipientList'
import statusLegends from '../../models/statusLegends'
import TotalDisplay from '../../components/TotalDisplay'
import TransactionDetailsCard from '../../components/TransactionDetailsCard'
import TreeView from '../../components/TreeView'
import Events from './Events'
import AlertInfo from './AlertInfo'
import ReprocessAlerts from './ReprocessAlerts'
import RefuseAlert from './RefuseAlert'
import RenderPayment from './RenderPayment'
import RenderOutAmountSubTitle from './RenderOutAmountSubtitle'
import style from './style.css'
import formatCpfCnpj from '../../formatters/cpfCnpj'
import formatDate from '../../formatters/longDate'

const isZeroOrNegative = value => value <= 0

const formatValues = map(when(
  isNil,
  always(0)
))

const getOutAmount = pipe(
  formatValues,
  sum,
  unless(
    isZeroOrNegative,
    negate
  )
)

const isEmptyOrNull = anyPass([isEmpty, isNil])

const isChargebackStatus = either(
  contains('chargeback'),
  contains('chargedback')
)

const isChargebackedTransaction = pipe(
  prop('status'),
  isChargebackStatus
)

const isBoletoTransaction = pipe(
  path(['payment', 'method']),
  equals('boleto')
)

const isWaitingPaymentTransaction = pipe(
  prop('status'),
  equals('waiting_payment')
)

const isBoletoWaitingPayment = both(
  isBoletoTransaction,
  isWaitingPaymentTransaction
)

const isPendingReviewTransaction = propEq('status', 'pending_review')

const showStatusAlert = either(
  isChargebackedTransaction,
  isBoletoWaitingPayment
)

const formatDocument = applySpec({
  number: pipe(
    prop('number'),
    formatCpfCnpj
  ),
  type: prop('type'),
})

const formatCustomerBirthDay = customer => ({
  ...customer,
  birthday: !isNil(customer.birthday)
    ? formatDate(customer.birthday)
    : null,
})

const getDefaultDocumentNumber = pipe(
  prop('documents'),
  ifElse(
    either(isNil, isEmpty),
    always(null),
    pipe(
      head,
      formatDocument,
      prop('number')
    )
  )
)

const formatCustomerAddress = (customer) => {
  if (!customer.address) {
    return customer
  }

  const { id, ...address } = customer.address

  return {
    ...address,
    ...customer,
  }
}

const formatCustomerDocuments = customer => ({
  ...customer,
  document_number: getDefaultDocumentNumber(customer),
})

const formatCustomerData = pipe(
  formatCustomerBirthDay,
  formatCustomerDocuments,
  formatCustomerAddress
)

const getHeaderAmountLabel = (transaction, headerLabels) => {
  if (isBoletoTransaction(transaction)) {
    return headerLabels.boletoAmountLabel
  }
  return headerLabels.cardAmountLabel
}

const renderLegend = status => (
  <Legend
    acronym={statusLegends[status].text}
    color={statusLegends[status].color}
    hideLabel
    textColor={statusLegends[status].textColor}
  >
    { statusLegends[status].text }
  </Legend>
)

const validatePreviousTransactionRedirect = (props, propName) => {
  if (propName === 'onPreviousTransactionRedirect') {
    const {
      onPreviousTransactionRedirect,
      transaction: {
        previousId,
      },
    } = props

    if (previousId && isNil(onPreviousTransactionRedirect)) {
      throw new Error('The prop onPreviousTransactionRedirect must be a function when transaction.previousId is not null')
    }
  }
}

const validateNextTransactionRedirect = (props, propName) => {
  if (propName === 'onNextTransactionRedirect') {
    const {
      nextTransactionId,
      onNextTransactionRedirect,
      transaction: {
        nextId,
      },
    } = props

    if ((nextId || nextTransactionId) && isNil(onNextTransactionRedirect)) {
      throw new Error('The prop onNextTransactionRedirect must be a function when transaction.nextId is not null')
    }
  }
}

const validateCaptureFunction = (props, propName) => {
  if (propName === 'onCapture') {
    const {
      onCapture,
      transaction: {
        capabilities,
      },
    } = props

    if (capabilities && capabilities.capturable && isNil(onCapture)) {
      throw new Error('The prop onCapture must be a function when transaction.capabilities.capturable is true')
    }
  }
}

const validateRefundFunction = (props, propName) => {
  if (propName === 'onRefund') {
    const {
      onRefund,
      transaction: {
        capabilities,
      },
    } = props

    if (capabilities && capabilities.refundable && isNil(onRefund)) {
      throw new Error('The prop onRefund must be a function when transaction.capabilities.refundable is true')
    }
  }
}

const validateReprocessFunction = (props, propName) => {
  if (propName === 'onReprocess') {
    const {
      onReprocess,
      transaction: {
        capabilities,
      },
    } = props

    if (capabilities && capabilities.reprocessable && isNil(onReprocess)) {
      throw new Error('The prop onReprocess must be a function when transaction.capabilities.reprocessable is true')
    }
  }
}

class TransactionDetails extends Component {
  constructor (props) {
    super(props)
    this.getActions = this.getActions.bind(this)
  }

  getActions () {
    const {
      actionLabels,
      headerLabels,
      loading: {
        reprocess,
      },
      onCapture,
      onExport,
      onManualReviewApprove,
      onManualReviewRefuse,
      onRefund,
      onReprocess,
      permissions,
      transaction,
      transaction: {
        capabilities,
        payment: {
          method,
        },
      },
    } = this.props

    const onCaptureAction = {
      icon: <CaptureIcon width={12} height={12} />,
      onClick: onCapture,
      title: method === 'boleto' && capabilities.capturable
        ? actionLabels.boleto
        : actionLabels.capture,
    }

    const onExportAction = {
      icon: <DownloadIcon width={12} height={12} />,
      onClick: onExport,
      title: actionLabels.export,
    }

    const onReprocessAction = {
      icon: <ReprocessIcon width={12} height={12} />,
      loading: reprocess,
      onClick: onReprocess,
      title: reprocess
        ? actionLabels.reprocessing
        : actionLabels.reprocess,
    }

    const onRefundAction = {
      icon: <IconReverse width={12} height={12} />,
      onClick: onRefund,
      title: actionLabels.refund,
    }

    const getManualReviewTransactionActions = (trx) => {
      if (isPendingReviewTransaction(trx) && permissions.manualReview) {
        return [
          {
            icon: <IconClearClose width={12} height={12} />,
            onClick: onManualReviewRefuse,
            title: headerLabels.refuseLabel,
          },
          {
            icon: <IconCheck width={12} height={12} />,
            onClick: onManualReviewApprove,
            title: headerLabels.approveLabel,
          },
        ]
      }
      return []
    }

    const detailsHeadActions = pipe(
      juxt([
        ifElse(
          propEq('capturable', true),
          always(onCaptureAction),
          always(null)
        ),
        ifElse(
          propEq('reprocessable', true),
          always(onReprocessAction),
          always(null)
        ),
        ifElse(
          propEq('refundable', true),
          always(onRefundAction),
          always(null)
        ),
        always(getManualReviewTransactionActions(transaction)),
        always(onExportAction),
      ]),
      flatten,
      reject(isNil)
    )

    return detailsHeadActions(capabilities)
  }

  render () {
    const {
      alertLabels,
      boletoWarningMessage,
      customerLabels,
      expandRecipients,
      headerLabels,
      installmentColumns,
      metadataTitle,
      nextTransactionId,
      onCopyBoletoUrl,
      onNextTransactionRedirect,
      onPreviousTransactionRedirect,
      onShowBoleto,
      paymentBoletoLabels,
      paymentCardLabels,
      recipientsLabels,
      reprocessLabels,
      t,
      tooltipLabels,
      totalDisplayLabels,
      transaction,
      transactionDetailsLabels,
    } = this.props

    const {
      acquirer,
      amount,
      boleto,
      card,
      customer,
      id,
      metadata,
      operations,
      payment,
      recipients,
      risk_level,
      soft_descriptor,
      status,
      status_reason,
      subscription,
    } = transaction

    const transactionDetailsContent = {
      acquirer_name: acquirer
        ? acquirer.name
        : null,
      acquirer_response_code: acquirer
        ? acquirer.response_code
        : null,
      authorization_code: acquirer
        ? acquirer.response_code
        : null,
      capture_method: card
        ? card.capture_method
        : null,
      nsu: acquirer
        ? acquirer.sequence_number
        : null,
      soft_descriptor,
      subscription_id: subscription
        ? subscription.id
        : null,
      tid: id,
    }

    const formattedCustomer = formatCustomerData(customer || {})
    const isRefundedBeforeCaptured = status === 'refunded' && payment.paid_amount === 0

    const applyTruncateCustomerEmail = (
      <span className={style.value}>
        <Truncate
          text={formattedCustomer.email}
        />
      </span>
    )

    const customerDetailsContent = {
      birthday: formattedCustomer && formattedCustomer.birthday,
      city: formattedCustomer && formattedCustomer.city,
      complementary: formattedCustomer && formattedCustomer.complementary,
      document_number: formattedCustomer && formattedCustomer.document_number,
      email: formattedCustomer.email && applyTruncateCustomerEmail,
      name: formattedCustomer && formattedCustomer.name,
      neighborhood: formattedCustomer && formattedCustomer.neighborhood,
      phone: formattedCustomer && formattedCustomer.phone,
      state: formattedCustomer && formattedCustomer.state,
      street: formattedCustomer && formattedCustomer.street,
      street_number: formattedCustomer && formattedCustomer.street_number,
      zipcode: formattedCustomer && formattedCustomer.zipcode,
    }

    if (isEmpty(transaction)) {
      return (<div />)
    }

    const detailsHeadProperties = [
      {
        children: renderLegend(status),
        title: headerLabels.statusLabel,
      },
      {
        children: headerLabels.installments,
        title: headerLabels.installmentsLabel,
      },
      {
        children: (
          <strong className={style.children}>
            {currencyFormatter(amount)}
          </strong>
        ),
        title: getHeaderAmountLabel(transaction, headerLabels),
      },
    ]

    return (
      <Grid className={style.grid}>
        <ReprocessAlerts
          nextTransactionId={nextTransactionId}
          onNextTransactionRedirect={onNextTransactionRedirect}
          onPreviousTransactionRedirect={onPreviousTransactionRedirect}
          reprocessLabels={reprocessLabels}
          transaction={transaction}
        />
        <Row stretch className={style.transactionInfo}>
          <Col
            desk={12}
            tv={12}
            tablet={12}
            palm={12}
          >
            <Card>
              <CardContent>
                <DetailsHead
                  actions={this.getActions()}
                  identifier={`#${id}`}
                  properties={detailsHeadProperties}
                  title={headerLabels.title}
                />
              </CardContent>
            </Card>
          </Col>
        </Row>
        <RefuseAlert
          acquirer={acquirer}
          status={status}
          statusReason={status_reason}
          t={t}
        />
        <Row stretch className={style.paymentInfo}>
          <Col
            desk={3}
            palm={12}
            tablet={6}
            tv={3}
          >
            <RenderPayment
              boleto={boleto}
              card={card}
              onCopyBoletoUrl={onCopyBoletoUrl}
              onShowBoleto={onShowBoleto}
              payment={payment}
              paymentBoletoLabels={paymentBoletoLabels}
              paymentCardLabels={paymentCardLabels}
            />
          </Col>
          <Col
            desk={3}
            palm={12}
            tablet={6}
            tv={3}
          >
            <Card className={style.paidAmountValue}>
              <CardContent className={style.content}>
                <TotalDisplay
                  align="start"
                  amount={isRefundedBeforeCaptured
                    ? payment.authorized_amount
                    : payment.paid_amount
                  }
                  amountSize="large"
                  color="#4d4f62"
                  subtitle={(
                    <div className={style.subtitle}>
                      {totalDisplayLabels.captured_at}
                    </div>
                  )}
                  title={isRefundedBeforeCaptured
                    ? totalDisplayLabels.authorized_amount
                    : totalDisplayLabels.paid_amount
                  }
                  titleSize="medium"
                />
              </CardContent>
            </Card>
          </Col>
          <Col
            desk={3}
            palm={12}
            tablet={6}
            tv={3}
          >
            <Card className={style.outAmountValue}>
              <CardContent className={style.content}>
                <TotalDisplay
                  align="start"
                  amount={
                    getOutAmount([
                      payment.refund_amount,
                      payment.mdr_amount,
                      payment.fraud_coverage_amount,
                    ])
                  }
                  amountSize="large"
                  color="#4d4f62"
                  subtitle={(
                    <RenderOutAmountSubTitle
                      payment={payment}
                      tooltipLabels={tooltipLabels}
                      totalDisplayLabels={totalDisplayLabels}
                    />
                  )}
                  title={totalDisplayLabels.out_amount}
                  titleSize="medium"
                />
              </CardContent>
            </Card>
          </Col>
          <Col
            desk={3}
            palm={12}
            tablet={6}
            tv={3}
          >
            <Card className={style.netAmountValue}>
              <CardContent className={style.content}>
                <TotalDisplay
                  align="start"
                  amount={(
                    payment.net_amount
                    + payment.cost_amount
                    - payment.fraud_coverage_amount
                  )}
                  amountSize="large"
                  color="#4d4f62"
                  subtitle={(
                    <div className={style.subtitle}>
                      {totalDisplayLabels.receive_date}
                    </div>
                  )}
                  title={totalDisplayLabels.net_amount}
                  titleSize="medium"
                />
              </CardContent>
            </Card>
          </Col>
        </Row>

        {showStatusAlert(transaction)
          && (
            <Row className={style.alertCustom}>
              <Col
                desk={12}
                palm={12}
                tablet={12}
                tv={12}
              >
                <Alert
                  action={alertLabels.resubmit}
                  icon={<IconInfo height={16} width={16} />}
                  type="info"
                >
                  <AlertInfo
                    alertLabels={alertLabels}
                    boletoWarningMessage={boletoWarningMessage}
                    isBoletoWaitingPayment={isBoletoWaitingPayment(transaction)}
                  />
                </Alert>
              </Col>
            </Row>
          )
        }

        <Row>
          <Col
            desk={9}
            palm={12}
            tablet={12}
            tv={9}
          >
            <Grid className={style.detailsInfo}>
              {!isEmptyOrNull(recipients)
                && (
                  <Row className={style.recipientsInfo}>
                    <Col
                      desk={12}
                      palm={12}
                      tablet={12}
                      tv={12}
                    >
                      <RecipientList
                        collapseInstallmentTitle={
                          recipientsLabels.collapseInstallmentTitle
                        }
                        expandAllRecipients={expandRecipients}
                        expandInstallmentTitle={
                          recipientsLabels.expandInstallmentTitle
                        }
                        installmentsTableColumns={installmentColumns}
                        installmentTotalLabel={
                          recipientsLabels.installmentTotalLabel
                        }
                        liabilitiesLabel={recipientsLabels.liabilitiesLabel}
                        netAmountLabel={recipientsLabels.netAmountLabel}
                        noRecipientLabel={recipientsLabels.noRecipientLabel}
                        outAmountLabel={recipientsLabels.outAmountLabel}
                        paymentMethod={payment.method}
                        recipients={recipients}
                        statusLabel={recipientsLabels.statusLabel}
                        title={recipientsLabels.title}
                        total={decimalCurrencyFormatter(payment.paid_amount)}
                        totalRecipientsLabel={
                          recipientsLabels.totalRecipientsLabel
                        }
                        totalTitle={recipientsLabels.totalTitle}
                      />
                    </Col>
                  </Row>
                )
              }
              {!isEmptyOrNull(customer)
                && (
                  <Row className={style.customerInfo}>
                    <Col
                      desk={12}
                      palm={12}
                      tablet={12}
                      tv={12}
                    >
                      <CustomerCard
                        contents={customerDetailsContent}
                        labels={customerLabels}
                        title={customerLabels.title}
                      />
                    </Col>
                  </Row>
                )
              }
              <Row className={style.transactionCardInfo}>
                <Col
                  desk={12}
                  palm={12}
                  tablet={12}
                  tv={12}
                >
                  <TransactionDetailsCard
                    contents={transactionDetailsContent}
                    labels={transactionDetailsLabels}
                    title={transactionDetailsLabels.title}
                  />
                </Col>
              </Row>
              {!isEmptyOrNull(metadata)
                && (
                  <Row className={style.metadataInfo}>
                    <Col
                      desk={12}
                      palm={12}
                      tablet={12}
                      tv={12}
                    >
                      <TreeView
                        data={metadata}
                        title={metadataTitle}
                      />
                    </Col>
                  </Row>
                )
              }
            </Grid>
          </Col>
          <Col
            desk={3}
            palm={12}
            tablet={12}
            tv={3}
            className={style.eventsList}
          >
            <Card>
              <CardTitle
                className={style.eventCardTitle}
                title={t('pages.transaction.events.title')}
              />
              <div>
                <Events
                  boleto={boleto}
                  color={statusLegends[status].color}
                  t={t}
                  id={id}
                  operations={operations}
                  payment={payment}
                  riskLevel={risk_level}
                />
              </div>
            </Card>
          </Col>
        </Row>
      </Grid>
    )
  }
}

TransactionDetails.propTypes = {
  actionLabels: PropTypes.shape({
    boleto: PropTypes.string,
    capture: PropTypes.string,
    export: PropTypes.string,
    refund: PropTypes.string,
    reprocess: PropTypes.string,
    reprocessing: PropTypes.string,
  }).isRequired,
  alertLabels: PropTypes.shape({
    chargeback_reason: PropTypes.string,
    chargeback_reason_label: PropTypes.string,
    reason_code: PropTypes.string,
    resubmit: PropTypes.string,
  }).isRequired,
  boletoWarningMessage: PropTypes.string.isRequired,
  customerLabels: PropTypes.shape({
    birthday: PropTypes.string,
    city: PropTypes.string,
    complement: PropTypes.string,
    document_number: PropTypes.string,
    email: PropTypes.string,
    name: PropTypes.string,
    neighborhood: PropTypes.string,
    number: PropTypes.string,
    phone: PropTypes.string,
    state: PropTypes.string,
    street: PropTypes.string,
    title: PropTypes.string,
    zip_code: PropTypes.string,
  }).isRequired,
  expandRecipients: PropTypes.bool,
  headerLabels: PropTypes.shape({
    installments: PropTypes.string,
    status: PropTypes.string,
    title: PropTypes.string,
  }).isRequired,
  installmentColumns: PropTypes.arrayOf(PropTypes.shape({
    costs: PropTypes.shape({
      anticipation: PropTypes.number,
      chargeback: PropTypes.number,
      mdr: PropTypes.number,
      refund: PropTypes.number,
    }),
    net_amount: PropTypes.number,
    number: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    original_payment_date: PropTypes.instanceOf(moment),
    payment_date: PropTypes.instanceOf(moment),
    status: PropTypes.string,
  })).isRequired,
  loading: PropTypes.shape({
    reprocess: PropTypes.bool,
  }),
  metadataTitle: PropTypes.string.isRequired,
  nextTransactionId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  onCapture: validateCaptureFunction,
  onCopyBoletoUrl: PropTypes.func,
  onDismissAlert: PropTypes.func, // eslint-disable-line react/no-unused-prop-types
  onExport: PropTypes.func,
  onManualReviewApprove: PropTypes.func,
  onManualReviewRefuse: PropTypes.func,
  onNextTransactionRedirect: validateNextTransactionRedirect,
  onPreviousTransactionRedirect: validatePreviousTransactionRedirect,
  onRefund: validateRefundFunction,
  onReprocess: validateReprocessFunction,
  onShowBoleto: PropTypes.func,
  paymentBoletoLabels: PropTypes.shape({
    copy: PropTypes.string,
    due_date: PropTypes.string,
    feedback: PropTypes.string,
    show: PropTypes.string,
    title: PropTypes.string,
  }).isRequired,
  paymentCardLabels: PropTypes.shape({
    title: PropTypes.string,
  }).isRequired,
  permissions: PropTypes.shape({
    manualReview: PropTypes.bool.isRequired,
    refund: PropTypes.bool.isRequired,
    reprocess: PropTypes.bool.isRequired,
  }).isRequired,
  recipientsLabels: PropTypes.shape({
    collapseInstallmentTitle: PropTypes.string,
    expandInstallmentTitle: PropTypes.string,
    installmentTotalLabel: PropTypes.string,
    liabilitiesLabel: PropTypes.string,
    netAmountLabel: PropTypes.string,
    noRecipientLabel: PropTypes.string,
    outAmountLabel: PropTypes.string,
    statusLabel: PropTypes.string,
    title: PropTypes.string,
    totalRecipientsLabel: PropTypes.string,
    totalTitle: PropTypes.string,
  }).isRequired,
  reprocessLabels: PropTypes.shape({
    nextAlert: PropTypes.string,
    previousAlert: PropTypes.string,
    showNext: PropTypes.string,
    showPrevious: PropTypes.string,
  }).isRequired,
  riskLevelsLabels: PropTypes.shape({
    high: PropTypes.string,
    low: PropTypes.string,
    moderated: PropTypes.string,
    very_high: PropTypes.string,
    very_low: PropTypes.string,
  }).isRequired,
  t: PropTypes.func.isRequired,
  tooltipLabels: PropTypes.shape({
    description: PropTypes.string,
    title: PropTypes.string,
  }).isRequired,
  totalDisplayLabels: PropTypes.shape({
    captured_at: PropTypes.string,
    cost: PropTypes.string,
    mdr: PropTypes.string,
    net_amount: PropTypes.string,
    out_amount: PropTypes.string,
    paid_amount: PropTypes.string,
    receive_date: PropTypes.string,
    refund: PropTypes.string,
  }).isRequired,
  transaction: PropTypes.shape({
    acquirer: PropTypes.shape({
      name: PropTypes.string,
      response_code: PropTypes.string,
      sequence_number: PropTypes.oneOfType([
        PropTypes.number,
        PropTypes.string,
      ]),
      transaction_id: PropTypes.oneOfType([
        PropTypes.number,
        PropTypes.string,
      ]),
    }),
    antifraud: PropTypes.object,
    boleto: PropTypes.shape({
      barcode: PropTypes.string,
      due_date: PropTypes.instanceOf(moment),
      url: PropTypes.string,
    }),
    capabilities: PropTypes.shape({
      capturable: PropTypes.bool,
      refundable: PropTypes.bool,
      reprocessable: PropTypes.bool,
    }),
    card: PropTypes.shape({
      brand_name: PropTypes.string,
      first_digits: PropTypes.string,
      holder_name: PropTypes.string,
      international: PropTypes.bool,
      last_digits: PropTypes.string,
      pin_mode: PropTypes.string,
    }),
    created_at: PropTypes.instanceOf(moment),
    customer: PropTypes.shape({
      birth_date: PropTypes.string,
      country: PropTypes.string,
      document_number: PropTypes.string,
      document_type: PropTypes.string,
      email: PropTypes.string,
      name: PropTypes.string,
      phones: PropTypes.arrayOf(PropTypes.string),
    }),
    external_id: PropTypes.string,
    id: PropTypes.number,
    metadata: PropTypes.object, // eslint-disable-line
    operations: PropTypes.arrayOf(PropTypes.shape({
      created_at: PropTypes.instanceOf(moment),
      cycle: PropTypes.number,
      status: PropTypes.string,
      type: PropTypes.string,
    })),
    payment: PropTypes.shape({
      cost_amount: PropTypes.number,
      installments: PropTypes.number,
      method: PropTypes.string,
      net_amount: PropTypes.number,
      paid_amount: PropTypes.number,
      refund_amount: PropTypes.number,
    }),
    recipients: PropTypes.arrayOf(PropTypes.shape({
      amount: PropTypes.number,
      installments: PropTypes.arrayOf(PropTypes.shape({
        amount: PropTypes.number,
        costs: PropTypes.shape({
          anticipation: PropTypes.number,
          mdr: PropTypes.number,
        }),
        created_at: PropTypes.instanceOf(moment),
        net_amount: PropTypes.number,
        number: PropTypes.number,
        original_payment_date: PropTypes.instanceOf(moment),
        payment_date: PropTypes.instanceOf(moment),
      })),
      liabilities: PropTypes.arrayOf(PropTypes.string),
      name: PropTypes.string,
      net_amount: PropTypes.number,
    })),
    soft_descriptor: PropTypes.string,
    status: PropTypes.string,
    status_reason: PropTypes.string,
    updated_at: PropTypes.instanceOf(moment),
  }).isRequired,
  transactionDetailsLabels: PropTypes.shape({
    acquirer_name: PropTypes.string,
    acquirer_response_code: PropTypes.string,
    authorization_code: PropTypes.string,
    capture_method: PropTypes.string,
    nsu: PropTypes.string,
    soft_descriptor: PropTypes.string,
    subscription_id: PropTypes.string,
    tid: PropTypes.string,
    title: PropTypes.string,
  }).isRequired,
}

TransactionDetails.defaultProps = {
  expandRecipients: false,
  loading: {
    reprocess: false,
  },
  nextTransactionId: null,
  onCapture: null,
  onCopyBoletoUrl: null,
  onDismissAlert: null,
  onExport: null,
  onManualReviewApprove: null,
  onManualReviewRefuse: null,
  onNextTransactionRedirect: null,
  onPreviousTransactionRedirect: null,
  onRefund: null,
  onReprocess: null,
  onShowBoleto: null,
}

export default TransactionDetails
