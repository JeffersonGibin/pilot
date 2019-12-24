import React from 'react'
import {
  always,
  both,
  complement,
  ifElse,
  is,
  isNil,
  juxt,
  map,
  pipe,
  prop,
  sum,
  unapply,
  unless,
} from 'ramda'
import currencyFormatter from '../../formatters/currency'
import dateFormatter from '../../formatters/longDate'
import legendStatus from '../../models/statusLegends'

const getNumber = unless(
  both(is(Number), complement(Number.isNaN)),
  always(0)
)

const sumParameters = unapply(pipe(map(getNumber), sum))

/* eslint-disable camelcase */

const renderOriginalPaymentDate = original_payment_date => (
  <div>
    {`de: ${original_payment_date}`}
  </div>
)

const renderOriginalPaymentDateIfExists = unless(
  isNil,
  renderOriginalPaymentDate
)

const renderPaymentDate = (hasOriginalPaymentDate, payment_date) => {
  if (hasOriginalPaymentDate) {
    return (
      <div>
        {`p/: ${payment_date}`}
      </div>
    )
  }
  return payment_date
}

const renderPaymentDatesComponent = ([payment_date, original_payment_date]) => (
  <div>
    {renderOriginalPaymentDateIfExists(original_payment_date)}
    {renderPaymentDate(!isNil(original_payment_date), payment_date)}
  </div>
)
/* eslint-enable camelcase */
const renderStatus = ({ status }) => (
  legendStatus[status]
    ? legendStatus[status].text
    : status
)

const isInvalidPaymentDate = pipe(
  prop('payment_date'),
  isNil
)

const isInvalidOriginalPaymentDate = pipe(
  prop('original_payment_date'),
  isNil
)

const getFormatedOriginalPaymentDate = pipe(
  prop('original_payment_date'),
  dateFormatter
)

const getOriginalPaymentDate = ifElse(
  isInvalidOriginalPaymentDate,
  always(null),
  getFormatedOriginalPaymentDate
)

const getPaymentDate = pipe(
  prop('payment_date'),
  dateFormatter
)

const getFormatedDates = juxt([
  getPaymentDate,
  getOriginalPaymentDate,
])

const renderPaymentDates = ifElse(
  isInvalidPaymentDate,
  getOriginalPaymentDate,
  pipe(
    getFormatedDates,
    renderPaymentDatesComponent
  )
)

const columns = [
  {
    accessor: ['number'],
    aggregationTitle: 'TOTAIS',
    align: 'center',
    orderable: false,
    title: 'models.installment.number',
  },
  {
    accessor: ['status'],
    orderable: false,
    renderer: renderStatus,
    title: 'models.installment.status',
  },
  {
    accessor: ['payment_date'],
    align: 'center',
    orderable: false,
    renderer: renderPaymentDates,
    title: 'models.installment.payment_date',
  },
  {
    accessor: ['amount'],
    aggregationRenderer: currencyFormatter,
    aggregator: sumParameters,
    align: 'end',
    orderable: false,
    renderer: ({ amount }) => currencyFormatter(amount),
    title: 'models.installment.total',
  },
  {
    accessor: ['costs', 'taxes'],
    aggregationRenderer: currencyFormatter,
    aggregator: sumParameters,
    align: 'end',
    orderable: false,
    renderer: ({ costs }) => currencyFormatter(costs.taxes),
    title: 'models.installment.tax',
  },
  {
    accessor: ['costs', 'anticipation'],
    aggregationRenderer: currencyFormatter,
    aggregator: sumParameters,
    align: 'end',
    orderable: false,
    renderer: ({ costs }) => currencyFormatter(costs.anticipation),
    title: 'models.installment.anticipation',
  },
  {
    accessor: ['costs', 'chargeback'],
    aggregationRenderer: currencyFormatter,
    aggregator: sumParameters,
    align: 'end',
    orderable: false,
    renderer: ({ costs }) => (
      costs.chargeback
        ? currencyFormatter(costs.chargeback)
        : currencyFormatter(costs.refund)
    ),
    title: 'models.installment.chargeback_refund',
  },
  {
    accessor: ['net_amount'],
    aggregationRenderer: currencyFormatter,
    aggregator: sumParameters,
    align: 'end',
    orderable: false,
    renderer: ({ costs }) => currencyFormatter(costs.net_amount),
    title: 'models.installment.net_amount',
  },
]

export default columns
