import React from 'react'
import PropTypes from 'prop-types'
import moment from 'moment-timezone'
import { withRouter } from 'react-router-dom'
import { connect } from 'react-redux'
import { translate } from 'react-i18next'
import qs from 'qs'
import XLSX from 'xlsx'
import {
  __,
  always,
  applySpec,
  assoc,
  compose,
  defaultTo,
  either,
  equals,
  identity,
  ifElse,
  isEmpty,
  isNil,
  juxt,
  mergeAll,
  mergeRight,
  nth,
  objOf,
  path,
  pipe,
  prop,
  replace,
  tail,
  unless,
  when,
} from 'ramda'
import { isMomentPropValidation } from 'former-kit'

import {
  requestSearch,
  receiveSearch,
  clearSearch,
} from './actions'

import dateSelectorPresets from '../../../models/dateSelectorPresets'
import filterOptions from '../../../models/transactionFilterOptions'
import TransactionsList from '../../../containers/TransactionsList'

const mapStateToProps = ({
  account: { client },
  transactions: { loading, query },
}) => ({ client, loading, query })

const mapDispatchToProps = dispatch => ({
  onReceiveSearch: ({ query }) => {
    dispatch(receiveSearch({ query }))
  },
  onRequestClearSearch: () => {
    dispatch(clearSearch())
  },
  onRequestSearch: (query) => {
    dispatch(requestSearch(query))
  },
})

const enhanced = compose(
  translate(),
  connect(
    mapStateToProps,
    mapDispatchToProps
  ),
  withRouter
)

const momentToString = momentObj => momentObj.format('MM/DD/YYYY')

const normalizeDateToString = property => pipe(
  prop(property),
  unless(
    either(isNil, isEmpty),
    pipe(momentToString, objOf(property))
  )
)

const normalizeQueryDatesToString = pipe(
  prop('dates'),
  juxt([normalizeDateToString('start'), normalizeDateToString('end')]),
  mergeAll
)

const stringToMoment = str => moment(str)

const normalizeDateTime = property => (date) => {
  if (property === 'start') {
    return date.startOf('day')
  }

  return date.endOf('day')
}

const normalizeStringToDate = property => pipe(
  prop(property),
  ifElse(
    either(isNil, isEmpty),
    always({ end: null, start: null }),
    pipe(
      stringToMoment,
      normalizeDateTime(property),
      objOf(property)
    )
  )
)

const normalizeQueryStringToDate = pipe(
  prop('dates'),
  juxt([normalizeStringToDate('start'), normalizeStringToDate('end')]),
  mergeAll,
  objOf('dates')
)

const normalizeTo = (defaultValue, propPath) => pipe(
  path(propPath),
  when(
    either(isNil, isEmpty),
    defaultTo(defaultValue)
  )
)

const normalizeQueryStructure = applySpec({
  count: pipe(
    normalizeTo(15, ['count']),
    Number
  ),
  filters: normalizeTo({}, ['filters']),
  offset: pipe(
    normalizeTo(1, ['offset']),
    Number
  ),
  search: normalizeTo('', ['search']),
  sort: {
    field: normalizeTo(['created_at'], ['sort', 'field']),
    order: normalizeTo('descending', ['sort', 'order']),
  },
})

const parseQueryUrl = pipe(
  tail,
  qs.parse,
  juxt([
    identity,
    normalizeQueryStringToDate,
    normalizeQueryStructure,
  ]),
  mergeAll
)

const handleCSVExportDownloadingClick = (data, filename) => {
  /* eslint-disable no-undef */
  const downloadLink = document.createElement('a')
  downloadLink.target = '_blank'
  downloadLink.download = filename.concat('csv')

  const blob = new Blob([data], { type: 'application/vnd.ms-excel' })

  const URL = window.URL || window.webkitURL
  const downloadUrl = URL.createObjectURL(blob)

  downloadLink.href = downloadUrl

  document.body.append(downloadLink)

  downloadLink.click()

  document.body.removeChild(downloadLink)
  URL.revokeObjectURL(downloadUrl)
  /* eslint-enable no-undef */
}

const handleXLSExportDownloadingClick = (data, filename) => {
  const workSheetName = 'sheetJS'
  const newWorkSheet = XLSX.utils.book_new()
  const dataWorkSheet = XLSX.utils.aoa_to_sheet(data)
  XLSX.utils.book_append_sheet(newWorkSheet, dataWorkSheet, workSheetName)

  XLSX.writeFile(newWorkSheet, filename.concat('xls'))
}

class TransactionsSearch extends React.Component {
  constructor (props) {
    super(props)

    const urlSearchQuery = props.history.location.search

    this.localizedPresets = dateSelectorPresets(props.t)

    this.state = {
      collapsed: true,
      confirmationDisabled: true,
      expandedRows: [],
      exporting: false,
      pendingReviewsCount: 0,
      query: isEmpty(urlSearchQuery)
        ? props.query
        : parseQueryUrl(urlSearchQuery),
      result: {
        chart: {
          dataset: [],
        },
        list: {
          rows: [],
        },
        total: {},
      },
      selectedRows: [],
      showDateInputCalendar: false,
      viewMode: 'table',
    }

    this.handleChartsCollapse = this.handleChartsCollapse.bind(this)
    this.handleDatePresetChange = this.handleDatePresetChange.bind(this)
    this.handleExport = this.handleExport.bind(this)
    this.handleFilterChange = this.handleFilterChange.bind(this)
    this.handleFilterConfirm = this.handleFilterConfirm.bind(this)
    this.handleFilterClear = this.handleFilterClear.bind(this)
    this.handleOrderChange = this.handleOrderChange.bind(this)
    this.handlePageChange = this.handlePageChange.bind(this)
    this.handlePageCountChange = this.handlePageCountChange.bind(this)
    this.handlePendingReviewsFilter = this.handlePendingReviewsFilter.bind(this)
    this.handleRowDetailsClick = this.handleRowDetailsClick.bind(this)
    this.handleSelectRow = this.handleSelectRow.bind(this)
    this.handleViewModeChange = this.handleViewModeChange.bind(this)
    this.requestData = this.requestData.bind(this)
    this.requestPendingReviewsCount = this.requestPendingReviewsCount.bind(this)
  }

  componentDidMount () {
    const { query } = this.state
    this.requestData(query)
  }

  componentDidUpdate (prevProps) {
    const { query } = this.props
    if (!equals(prevProps.query, query)) {
      this.setState({ // eslint-disable-line react/no-did-update-set-state
        query,
      })

      this.updateQuery(query)
    }
  }

  requestPendingReviewsCount () {
    const { client } = this.props

    return client
      .transactions
      .countPendingReviews()
      .then(({ count }) => {
        this.setState({
          pendingReviewsCount: count,
        })
      })
  }

  handlePendingReviewsFilter () {
    this.handleFilterConfirm({
      dates: {},
      filters: {
        status: ['pending_review'],
      },
      search: '',
      sort: {
        field: ['created_at'],
        order: 'ascending',
      },
    })
  }

  updateQuery (query) {
    const {
      history: {
        location,
        push,
      },
    } = this.props

    const buildSearchQuery = pipe(
      normalizeQueryDatesToString,
      assoc('dates', __, query),
      qs.stringify
    )

    const newQuery = buildSearchQuery(query)
    const currentQuery = replace('?', '', location.search)

    this.setState({
      expandedRows: [],
      selectedRows: [],
    })

    if (currentQuery !== newQuery) {
      push({
        pathname: 'transactions',
        search: newQuery,
      })

      this.requestData(query)
    }
  }

  requestData (query) {
    const {
      client,
      onReceiveSearch,
      onRequestSearch,
    } = this.props

    onRequestSearch({ query })

    return client
      .transactions
      .search(query)
      .then((res) => {
        this.setState({
          ...res,
          query,
        })
        onReceiveSearch(res)
      })
  }

  handleDatePresetChange (dates) {
    const { query } = this.state
    this.setState({
      query: {
        ...query,
        dates,
      },
      showDateInputCalendar: true,
    })
  }

  handlePageCountChange (count) {
    const { query: stateQuery } = this.state
    const query = {
      ...stateQuery,
      count,
      offset: 1,
    }

    this.updateQuery(query)
  }

  handleOrderChange (field, order) {
    const { query: stateQuery } = this.state
    const query = {
      ...stateQuery,
      offset: 1,
      sort: {
        field,
        order,
      },
    }

    this.updateQuery(query)
  }

  handleFilterChange (query) {
    const { query: stateQuery } = this.state
    const newQuery = mergeRight(stateQuery, query)

    this.setState({
      confirmationDisabled: false,
      query: newQuery,
    })
  }

  handleFilterClear () {
    const { onRequestClearSearch } = this.props
    this.setState({
      confirmationDisabled: true,
    })

    onRequestClearSearch()
  }

  handleFilterConfirm ({
    dates,
    filters,
    search,
    sort,
  }) {
    const { query: stateQuery } = this.state
    const query = {
      ...stateQuery,
      dates,
      filters,
      offset: 1,
      search,
      sort: sort || stateQuery.sort,
    }
    this.setState({
      confirmationDisabled: true,
    })

    this.updateQuery(query)
  }

  handlePageChange (page) {
    const { query: stateQuery } = this.state
    const query = {
      ...stateQuery,
      offset: page,
    }

    this.updateQuery(query)
  }

  handleChartsCollapse () {
    const { collapsed } = this.state

    this.setState({
      collapsed: !collapsed,
    })
  }

  handleRowDetailsClick (rowIndex) {
    const { history } = this.props
    const { result } = this.state
    const rowData = nth(rowIndex, result.list.rows)
    const { id } = rowData
    history.push(`/transactions/${id}`)
  }

  handleViewModeChange (viewMode) {
    this.setState({
      viewMode,
    })
  }

  handleExport (exportType) {
    this.setState({ exporting: true })
    const { client } = this.props
    const {
      query,
      result,
    } = this.state

    const newQuery = {
      ...query,
      count: result.total.count,
    }
    return client
      .transactions
      .exportData(newQuery, exportType)
      .then((res) => {
        const filename = `Pagarme - ${moment().format('LLL')}.`
        if (exportType === 'csv') {
          handleCSVExportDownloadingClick(res, filename)
        } else {
          handleXLSExportDownloadingClick(res, filename)
        }

        this.setState({ exporting: false })
      })
  }

  handleSelectRow (selectedRows) {
    this.setState({
      selectedRows,
    })
  }

  render () {
    const {
      collapsed,
      columns,
      confirmationDisabled,
      expandedRows,
      exporting,
      pendingReviewsCount,
      query,
      query: {
        count,
        offset,
        sort,
      },
      result: {
        chart,
        list,
        total,
      },
      selectedRows,
      showDateInputCalendar,
      viewMode,
    } = this.state

    const {
      loading,
      t,
    } = this.props

    const pagination = {
      offset,
      total: Math.ceil(total.count / count),
    }

    return (
      <TransactionsList
        amount={total.payment
          ? total.payment.paid_amount
          : 0
        }
        collapsed={collapsed}
        columns={columns}
        count={total.count}
        confirmationDisabled={confirmationDisabled}
        data={chart.dataset}
        dateSelectorPresets={this.localizedPresets}
        expandedRows={expandedRows}
        exporting={exporting}
        filterOptions={filterOptions}
        loading={loading}
        onChangeViewMode={this.handleViewModeChange}
        onChartsCollapse={this.handleChartsCollapse}
        onDatePresetChange={this.handleDatePresetChange}
        onExport={this.handleExport}
        onFilterChange={this.handleFilterChange}
        onFilterConfirm={this.handleFilterConfirm}
        onFilterClear={this.handleFilterClear}
        onOrderChange={this.handleOrderChange}
        onPageChange={this.handlePageChange}
        onPageCountChange={this.handlePageCountChange}
        onPendingReviewsFilter={this.handlePendingReviewsFilter}
        onRowClick={this.handleRowDetailsClick}
        onSelectRow={this.handleSelectRow}
        order={sort.order}
        orderField={sort.field}
        pagination={pagination}
        pendingReviewsCount={pendingReviewsCount}
        query={query}
        rows={list.rows}
        selectedPage={count}
        selectedRows={selectedRows}
        showDateInputCalendar={showDateInputCalendar}
        t={t}
        viewMode={viewMode}
      />
    )
  }
}

TransactionsSearch.propTypes = {
  client: PropTypes.shape({
    transactions: PropTypes.shape({
      countPendingReviews: PropTypes.func.isRequired,
      exportData: PropTypes.func.isRequired,
      search: PropTypes.func.isRequired,
    }).isRequired,
  }).isRequired,
  history: PropTypes.shape({
    location: PropTypes.shape({
      search: PropTypes.string,
    }).isRequired,
    push: PropTypes.func.isRequired,
  }).isRequired,
  loading: PropTypes.bool.isRequired,
  onReceiveSearch: PropTypes.func.isRequired,
  onRequestClearSearch: PropTypes.func.isRequired,
  onRequestSearch: PropTypes.func.isRequired,
  query: PropTypes.shape({
    count: PropTypes.number.isRequired,
    dates: PropTypes.shape({
      end: isMomentPropValidation,
      start: isMomentPropValidation,
    }),
    filters: PropTypes.shape({}),
    offset: PropTypes.number.isRequired,
    search: PropTypes.string,
    sort: PropTypes.shape({
      field: PropTypes.arrayOf(PropTypes.string),
      order: PropTypes.string,
    }),
  }).isRequired,
  t: PropTypes.func.isRequired,
}

export default enhanced(TransactionsSearch)
