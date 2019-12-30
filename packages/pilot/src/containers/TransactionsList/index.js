import React, { Fragment } from 'react'
import PropTypes from 'prop-types'
import moment from 'moment-timezone'

import IconChart from 'emblematic-icons/svg/TrendingUp32.svg'
import IconTable from 'emblematic-icons/svg/Menu32.svg'
import IconWarning from 'emblematic-icons/svg/Warning32.svg'
import Search32 from 'emblematic-icons/svg/Search32.svg'
import Calendar32 from 'emblematic-icons/svg/Calendar32.svg'
import Download32 from 'emblematic-icons/svg/Download32.svg'

import {
  findIndex,
  pick,
  propEq,
} from 'ramda'

import {
  Alert,
  Card,
  CardActions,
  CardContent,
  CardTitle,
  Col,
  DateInput,
  Dropdown,
  Flexbox,
  Grid,
  Input,
  Pagination,
  Row,
  SegmentedSwitch,
  isMomentPropValidation,
} from 'former-kit'

import style from './style.css'

import Charts from './Charts'
import ExportData from '../../components/ExportData'
import Filter from '../Filter'
import TableList from './TableList'

import tableColumns from './tableColumns'

import { Message } from '../../components/Message'
import EmptyStateIcon from './EmptyStateIcon.svg'

import itemsPerPage from '../../models/itemsPerPage'
import formatCurrency from '../../formatters/currency'
import formatDate from '../../formatters/longDate'
import translateDateInput from '../../formatters/dateInputTranslator'

const formatSelectedPeriod = (t, { end, start }) => {
  if (!start && !end) {
    return t('pages.transactions.period_full')
  }

  if (moment(start).isSame(end, 'days')) {
    return t('pages.transactions.period_today')
  }

  return t(
    'pages.transactions.period',
    {
      end: formatDate(end),
      start: formatDate(start),
    }
  )
}

const getExportOptions = onExport => ([
  {
    action: () => onExport('csv'),
    title: 'CSV',
  },
  {
    action: () => onExport('xls'),
    title: 'Excel',
  },
])

const buildEmptyState = t => (
  <Flexbox
    alignItems="center"
    className={style.emptyStateBlock}
    direction="column"
  >
    <Message
      image={<EmptyStateIcon width={365} height={148} />}
      message={(
        <Fragment>
          <div>
            {t('pages.transactions.no_results_title')}
          </div>
          <div>
            {t('pages.transactions.no_results_message')}
          </div>
        </Fragment>
      )}
    />
  </Flexbox>
)

const TransactionsList = ({
  amount,
  confirmationDisabled,
  count,
  data,
  dateSelectorPresets,
  exporting,
  filterOptions,
  loading,
  onChangeViewMode,
  onDatePresetChange,
  onExport,
  onFilterChange,
  onFilterClear,
  onFilterConfirm,
  onOrderChange,
  onPageChange,
  onPageCountChange,
  onPendingReviewsFilter,
  onRowClick,
  onSelectRow,
  order,
  orderField,
  pagination,
  pendingReviewsCount,
  query,
  rows,
  selectedPage,
  selectedRows,
  showDateInputCalendar,
  t,
  viewMode,
}) => {
  const columns = tableColumns({ t })
  const orderColumn = findIndex(propEq('accessor', orderField), columns)
  const handleOrderChange = (
    columnIndex,
    tableOrder
  ) => onOrderChange(columns[columnIndex].accessor, tableOrder)

  return (
    <Grid>
      {pendingReviewsCount > 0
        && (
          <Row>
            <Col
              desk={12}
              palm={12}
              tablet={12}
              tv={12}
            >
              <Alert
                action={t('pages.transaction.view_transactions')}
                icon={<IconWarning height={16} width={16} />}
                onDismiss={onPendingReviewsFilter}
                type="warning"
              >
                <p>
                  <strong>{t('pages.transaction.alert.warning')}</strong>&nbsp;
                  {
                    t('pages.transaction.alert.pending_review', { count: pendingReviewsCount })
                  }
                </p>
              </Alert>
            </Col>
          </Row>
        )
      }
      <Row>
        <Col
          palm={12}
          tablet={12}
          desk={12}
          tv={12}
        >
          <Filter
            confirmationDisabled={confirmationDisabled}
            disabled={loading}
            onConfirm={onFilterConfirm}
            onChange={onFilterChange}
            onClear={onFilterClear}
            options={filterOptions}
            query={pick(['dates', 'filters', 'search'], query)}
            t={t}
          >
            <DateInput
              dates={query.dates}
              icon={<Calendar32 width={16} height={16} />}
              name="dates"
              presets={dateSelectorPresets}
              strings={translateDateInput(t)}
              onPresetChange={onDatePresetChange}
              selectionMode={
                query.dates.start
                && query.dates.start.isSame(query.dates.end, 'day')
                  ? 'single'
                  : 'period'
              }
              showCalendar={showDateInputCalendar}
            />
            <Input
              icon={<Search32 width={16} height={16} />}
              name="search"
              placeholder={t('pages.transactions.text_search_placeholder')}
            />
          </Filter>
        </Col>
        <Col
          palm={12}
          tablet={12}
          desk={12}
          tv={12}
        >
          {!rows.length && !loading && buildEmptyState(t)}
          {rows.length > 0
            && (
              <Card>
                <CardTitle
                  title={(
                    <h2 className={style.customTitle}>
                      <span className={style.type}>
                        {formatSelectedPeriod(t, query.dates)}
                      </span>
                      <div className={style.verticalDivider} />
                      <span className={style.type}>
                        {count}&nbsp;
                      </span>
                      <small>{t('pages.transactions.count')}</small>&nbsp;
                      <small>-</small>&nbsp;
                      <small>{t('pages.transactions.total_amount')}</small>&nbsp;
                      <span className={style.type}>
                        {formatCurrency(amount)}
                      </span>
                    </h2>
                  )}
                  subtitle={(
                    <div className={style.toolBar}>
                      {viewMode === 'table'
                        && (
                          <Fragment>
                            <ExportData
                              exportOptions={getExportOptions(onExport)}
                              icon={<Download32 width={12} height={12} />}
                              loading={exporting}
                              placement="bottomEnd"
                              relevance="low"
                              size="tiny"
                              subtitle={t('export_to')}
                              title={t('export_table')}
                            />
                            <Dropdown
                              disabled={loading || viewMode === 'graph'}
                              name="page-count"
                              onChange={({ target: { value } }) => (
                                onPageCountChange(parseInt(value, 10))
                              )}
                              options={itemsPerPage.map(i => ({
                                name: t('items_per_page', { count: i }),
                                value: `${i}`,
                              }))}
                              size="tiny"
                              value={selectedPage.toString()}
                            />
                            <Pagination
                              currentPage={pagination.offset}
                              disabled={loading || viewMode === 'graph'}
                              onPageChange={onPageChange}
                              size="tiny"
                              strings={{
                                of: t('components.pagination.of'),
                              }}
                              totalPages={pagination.total}
                            />
                          </Fragment>
                        )
                      }
                      <SegmentedSwitch
                        disabled={loading}
                        name="view-mode"
                        onChange={onChangeViewMode}
                        options={[
                          {
                            title: <IconTable width={16} height={16} />,
                            value: 'table',
                          },
                          {
                            title: <IconChart width={16} height={16} />,
                            value: 'chart',
                          },
                        ]}
                        value={viewMode}
                      />
                    </div>
                  )}
                />

                <CardContent>
                  {viewMode === 'chart'
                    && (
                      <Charts
                        loading={loading}
                        data={data}
                        legendsTitle={t('pages.transactions.graphic_legends')}
                        t={t}
                      />
                    )
                  }
                  {viewMode === 'table'
                    && (
                      <TableList
                        columns={columns}
                        disabled={loading}
                        loading={loading}
                        maxColumns={6}
                        onOrderChange={handleOrderChange}
                        onRowClick={onRowClick}
                        onSelectRow={onSelectRow}
                        orderColumn={orderColumn}
                        orderSequence={order}
                        rows={rows}
                        selectedRows={selectedRows}
                      />
                    )
                  }
                </CardContent>

                {viewMode === 'table'
                  && (
                    <CardActions>
                      <Pagination
                        currentPage={pagination.offset}
                        disabled={loading}
                        onPageChange={onPageChange}
                        strings={{
                          of: t('components.pagination.of'),
                        }}
                        size="tiny"
                        totalPages={pagination.total}
                      />
                    </CardActions>
                  )
                }
              </Card>
            )
          }
        </Col>
      </Row>
    </Grid>
  )
}

TransactionsList.propTypes = {
  amount: PropTypes.number,
  confirmationDisabled: PropTypes.bool,
  count: PropTypes.number,
  data: PropTypes.arrayOf(PropTypes.object),
  dateSelectorPresets: PropTypes.arrayOf(PropTypes.shape({
    date: PropTypes.func,
    items: PropTypes.arrayOf(PropTypes.shape({
      date: PropTypes.func,
      title: PropTypes.string,
    })),
    key: PropTypes.string,
    title: PropTypes.string,
  })).isRequired,
  exporting: PropTypes.bool.isRequired,
  filterOptions: PropTypes.arrayOf(PropTypes.shape({
    items: PropTypes.arrayOf(PropTypes.shape({
      label: PropTypes.string,
      value: PropTypes.string,
    })),
    key: PropTypes.string,
    name: PropTypes.string,
  })).isRequired,
  loading: PropTypes.bool.isRequired,
  onChangeViewMode: PropTypes.func.isRequired,
  onDatePresetChange: PropTypes.func.isRequired,
  onExport: PropTypes.func.isRequired,
  onFilterChange: PropTypes.func.isRequired,
  onFilterClear: PropTypes.func.isRequired,
  onFilterConfirm: PropTypes.func.isRequired,
  onOrderChange: PropTypes.func.isRequired,
  onPageChange: PropTypes.func.isRequired,
  onPageCountChange: PropTypes.func.isRequired,
  onPendingReviewsFilter: PropTypes.func.isRequired,
  onRowClick: PropTypes.func.isRequired,
  onSelectRow: PropTypes.func.isRequired,
  order: PropTypes.string,
  orderField: PropTypes.arrayOf(PropTypes.string),
  pagination: PropTypes.shape({
    offset: PropTypes.number,
    total: PropTypes.number,
  }).isRequired,
  pendingReviewsCount: PropTypes.number.isRequired,
  query: PropTypes.shape({
    dates: PropTypes.shape({
      end: isMomentPropValidation,
      start: isMomentPropValidation,
    }),
    properties: PropTypes.object,
    search: PropTypes.string,
  }),
  rows: PropTypes.arrayOf(PropTypes.object).isRequired,
  selectedPage: PropTypes.number,
  selectedRows: PropTypes.arrayOf(PropTypes.number).isRequired,
  showDateInputCalendar: PropTypes.bool,
  t: PropTypes.func.isRequired,
  viewMode: PropTypes.oneOf(['chart', 'table']).isRequired,
}

TransactionsList.defaultProps = {
  amount: 0,
  confirmationDisabled: true,
  count: 0,
  data: null,
  order: 'descending',
  orderField: [],
  query: {
    dates: {
      end: moment(),
      start: moment(),
    },
    properties: {},
    search: '',
  },
  selectedPage: 15,
  showDateInputCalendar: false,
}

export default TransactionsList
