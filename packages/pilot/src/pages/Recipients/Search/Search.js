import React from 'react'
import PropTypes from 'prop-types'
import { withRouter } from 'react-router-dom'
import { connect } from 'react-redux'
import { translate } from 'react-i18next'
import qs from 'qs'

import {
  append,
  applySpec,
  compose,
  cond,
  contains,
  defaultTo,
  either,
  equals,
  flatten,
  identity,
  isEmpty,
  isNil,
  juxt,
  mergeAll,
  path,
  pipe,
  prop,
  replace,
  T,
  tail,
  when,
  without,
} from 'ramda'

import {
  requestSearch,
  receiveSearch,
} from './actions'

import RecipientTable from '../../../containers/RecipientTable'

import { initialState } from './reducer'

const mapStateToProps = ({
  account: { client },
  recipients: { loading, query },
}) => ({ client, loading, query })

const mapDispatchToProps = ({
  onReceiveSearch: receiveSearch,
  onRequestSearch: requestSearch,
})

const enhanced = compose(
  translate(),
  connect(
    mapStateToProps,
    mapDispatchToProps
  ),
  withRouter
)

const normalizeTo = (defaultValue, propPath) => pipe(
  path(propPath),
  when(
    either(isNil, isEmpty),
    defaultTo(defaultValue)
  )
)

const normalizeQueryStructure = applySpec({
  count: pipe(normalizeTo(15, ['count']), Number),
  offset: pipe(normalizeTo(1, ['offset']), Number),
  search: normalizeTo('', ['search']),
})

const parseQueryUrl = pipe(
  tail,
  qs.parse,
  juxt([
    identity,
    normalizeQueryStructure,
  ]),
  mergeAll
)

const isRecipientId = (recipientText) => {
  const recipientPattern = /^(re_)(\w){25}/
  return recipientPattern.test(recipientText)
}

const isBankAccount = (bankAccount) => {
  if (!bankAccount || bankAccount.length > 10) {
    return false
  }
  const bankNumber = Number(bankAccount)

  return Number.isInteger(bankNumber)
}

const getKeyFormatter = key => applySpec({ [key]: identity })

const getQueryKey = pipe(
  prop('search'),
  cond([
    [isRecipientId, getKeyFormatter('id')],
    [isBankAccount, getKeyFormatter('bank_account_id')],
    [T, getKeyFormatter('name')],
  ])
)

const getQueryObject = applySpec({
  count: prop('count'),
  page: prop('offset'),
})

const mountQueryObject = pipe(
  juxt([
    getQueryKey,
    getQueryObject,
  ]),
  mergeAll
)

class RecipientsSearch extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      confirmationDisabled: true,
      expandedRows: [],
      next: null,
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
    }

    this.handleExpandRow = this.handleExpandRow.bind(this)
    this.handleFilterChange = this.handleFilterChange.bind(this)
    this.handleFilterClear = this.handleFilterClear.bind(this)
    this.handleFilterConfirm = this.handleFilterConfirm.bind(this)
    this.handlePageChange = this.handlePageChange.bind(this)
    this.handleRowClick = this.handleRowClick.bind(this)
    this.handleRowDetailsClick = this.handleRowDetailsClick.bind(this)
    this.requestData = this.requestData.bind(this)
  }

  componentDidMount () {
    const {
      history,
      query,
    } = this.props

    const urlSearchQuery = history.location.search
    if (isEmpty(urlSearchQuery)) {
      this.updateQuery(query)
    } else {
      this.requestData(parseQueryUrl(urlSearchQuery))
    }
  }

  componentDidUpdate (prevProps) {
    const { query } = this.props
    if (!equals(prevProps.query, query)) {
      this.updateQuery(query)
    }
  }

  updateQuery (query) {
    const {
      history: {
        location,
        push,
      },
    } = this.props

    const buildSearchQuery = qs.stringify

    const newQuery = buildSearchQuery(query)
    const currentQuery = replace('?', '', location.search)

    this.setState({
      expandedRows: [],
      selectedRows: [],
    })

    if (currentQuery !== newQuery) {
      push({
        pathname: 'recipients',
        search: newQuery,
      })

      this.requestData(query)
    }
  }

  requestRecipients (query, nextPage) {
    const {
      client,
      onReceiveSearch,
      onRequestSearch,
    } = this.props
    const newQuery = nextPage ? { ...query, offset: nextPage } : query

    if (!nextPage) {
      onRequestSearch({ query })
    }

    return client.recipients
      .find(mountQueryObject(newQuery))
      .then((res) => {
        const total = {
          count: res.length,
          offset: query.offset,
        }

        const result = {
          list: {
            rows: flatten([res]),
          },
          total,
        }

        if (nextPage) {
          this.setState({
            next: {
              page: nextPage,
              result,
            },
          })
        } else {
          if (!newQuery && res.length >= query.count) {
            this.requestRecipients(query, query.offset + 1)
          }

          this.setState({ result })

          onReceiveSearch({ query })
        }
      })
      .catch((error) => {
        if (error) {
          onReceiveSearch({ query })

          this.setState({
            result: {
              list: {
                rows: [],
              },
            },
          })
        }
      })
  }

  requestData (query) {
    const { next } = this.state

    if (next && next.page === query.offset) {
      this.requestRecipients(query, query.offset + 1)
      return Promise.resolve(next.result)
    }

    return this.requestRecipients(query)
  }

  handleFilterClear () {
    this.setState({
      confirmationDisabled: true,
    })

    this.updateQuery(initialState.query)
  }

  handleFilterConfirm ({
    filters,
    search,
  }) {
    const { query } = this.props
    const newQuery = {
      ...query,
      filters,
      offset: 1,
      search,
    }

    this.setState({
      confirmationDisabled: true,
    })

    this.updateQuery(newQuery)
  }

  handleFilterChange () {
    this.setState({
      confirmationDisabled: false,
    })
  }

  handlePageChange (page) {
    const { query } = this.props
    const newQuery = {
      ...query,
      offset: page,
    }

    this.updateQuery(newQuery)
  }

  handleRowDetailsClick (row) {
    const { result } = this.state
    const recipient = result.list.rows[row]
    const { history } = this.props
    history.push(`/recipients/detail/${recipient.id}`)
  }

  handleRowClick (index) {
    const { expandedRows } = this.state
    this.setState({
      expandedRows: contains(index, expandedRows)
        ? without([index], expandedRows)
        : append(index, expandedRows),
    })
  }

  handleExpandRow (expandedRows) {
    this.setState({
      expandedRows,
    })
  }

  render () {
    const {
      confirmationDisabled,
      expandedRows,
      result: {
        list,
      },
      selectedRows,
    } = this.state

    const {
      history: {
        push,
      },
      query,
      query: {
        count,
        offset,
      } = {},
      loading,
      t,
    } = this.props

    const pagination = {
      offset,
      total: list.rows.length === count
        ? 100
        : offset,
    }

    return (
      <RecipientTable
        confirmationDisabled={confirmationDisabled}
        expandedRows={expandedRows}
        loading={loading}
        push={push}
        onChangeViewMode={this.handleViewModeChange}
        onDetailsClick={this.handleRowDetailsClick}
        onExpandRow={this.handleExpandRow}
        onFilterChange={this.handleFilterChange}
        onFilterConfirm={this.handleFilterConfirm}
        onFilterClear={this.handleFilterClear}
        onPageChange={this.handlePageChange}
        onRowClick={this.handleRowClick}
        pagination={pagination}
        rows={list.rows}
        selectedRows={selectedRows}
        query={query}
        t={t}
      />
    )
  }
}

RecipientsSearch.propTypes = {
  client: PropTypes.shape({
    recipients: PropTypes.shape({
      find: PropTypes.func.isRequired,
    }).isRequired,
  }).isRequired,
  history: PropTypes.shape({
    location: PropTypes.shape({
      search: PropTypes.string,
    }).isRequired,
    push: PropTypes.func.isRequired,
  }).isRequired,
  loading: PropTypes.bool.isRequired,
  location: PropTypes.shape({
    search: PropTypes.string,
  }).isRequired,
  onReceiveSearch: PropTypes.func.isRequired,
  onRequestSearch: PropTypes.func.isRequired,
  query: PropTypes.shape({
    count: PropTypes.number.isRequired,
    filters: PropTypes.shape({}),
    offset: PropTypes.number.isRequired,
    search: PropTypes.string,
  }),
  t: PropTypes.func.isRequired,
}

RecipientsSearch.defaultProps = {
  query: {
    offset: 1,
  },
}

export default enhanced(RecipientsSearch)
