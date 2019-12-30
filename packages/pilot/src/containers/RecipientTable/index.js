import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'

import AddIcon from 'emblematic-icons/svg/Add32.svg'
import Search32 from 'emblematic-icons/svg/Search32.svg'

import {
  Button,
  Card,
  CardActions,
  CardContent,
  CardTitle,
  Col,
  Grid,
  Input,
  Pagination,
  Row,
} from 'former-kit'

import style from './style.css'
import Filter from '../Filter'
import tableColumns from './tableColumns'

import NotFoundMessage from './NotFoundMessage'
import TableData from '../../components/Operations/TableData'

const RecipientTable = ({
  confirmationDisabled,
  expandedRows,
  filterOptions,
  loading,
  onDetailsClick,
  onExpandRow,
  onFilterChange,
  onFilterClear,
  onFilterConfirm,
  onPageChange,
  onRowClick,
  pagination: {
    offset,
    total,
  },
  push,
  query,
  rows,
  selectedRows,
  t,
}) => {
  const [newQuery, setQuery] = useState(query)

  const handleFilterChange = (value) => {
    setQuery(value)
    onFilterChange()
  }

  const columns = tableColumns({
    onDetailsClick,
    t,
  })

  useEffect(() => {
    setQuery(query)
  }, [query])

  return (
    <Grid>
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
            onChange={handleFilterChange}
            onClear={onFilterClear}
            options={filterOptions}
            query={newQuery}
            t={t}
          >
            <Input
              icon={<Search32 width={16} height={16} />}
              name="search"
              placeholder={t('pages.recipients.text_search_placeholder')}
            />
          </Filter>
        </Col>
        <Col
          palm={12}
          tablet={12}
          desk={12}
          tv={12}
        >
          {rows.length === 0
          && (
            <NotFoundMessage
              onFilterClear={onFilterClear}
              t={t}
            />
          )}
          {rows.length > 0
          && (
            <Card>
              <CardTitle
                title={(
                  <h2 className={style.customTitle}>
                    {t('pages.recipients.title')}
                  </h2>
                )}
                subtitle={(
                  <div>
                    <div className={style.marginRight}>
                      <Button
                        type="button"
                        icon={<AddIcon width={16} height={16} />}
                        fill="outline"
                        onClick={() => { push('/recipients/add') }}
                      >
                        {t('pages.recipients.add')}
                      </Button>
                    </div>
                    <Pagination
                      currentPage={offset}
                      disabled={loading}
                      format="single"
                      onPageChange={onPageChange}
                      totalPages={total}
                    />
                  </div>
                )}
              />
              <CardContent>
                <TableData
                  columns={columns}
                  disabled={loading}
                  expandable
                  expandedRows={expandedRows}
                  loading={loading}
                  maxColumns={6}
                  onExpandRow={onExpandRow}
                  onRowClick={onRowClick}
                  rows={rows}
                  selectedRows={selectedRows}
                />
              </CardContent>
              <CardActions>
                <Pagination
                  currentPage={offset}
                  disabled={loading}
                  format="single"
                  onPageChange={onPageChange}
                  strings={{
                    of: t('components.pagination.of'),
                  }}
                  totalPages={total}
                />
              </CardActions>
            </Card>
          )}
        </Col>
      </Row>
    </Grid>
  )
}

RecipientTable.propTypes = {
  confirmationDisabled: PropTypes.bool,
  expandedRows: PropTypes.arrayOf(PropTypes.number).isRequired,
  filterOptions: PropTypes.arrayOf(PropTypes.shape({
    items: PropTypes.arrayOf(PropTypes.shape({
      label: PropTypes.string,
      value: PropTypes.string,
    })),
    key: PropTypes.string,
    name: PropTypes.string,
  })),
  loading: PropTypes.bool.isRequired,
  onDetailsClick: PropTypes.func.isRequired,
  onExpandRow: PropTypes.func.isRequired,
  onFilterChange: PropTypes.func.isRequired,
  onFilterClear: PropTypes.func.isRequired,
  onFilterConfirm: PropTypes.func.isRequired,
  onPageChange: PropTypes.func.isRequired,
  onRowClick: PropTypes.func.isRequired,
  pagination: PropTypes.shape({
    offset: PropTypes.number,
    total: PropTypes.number,
  }).isRequired,
  push: PropTypes.func.isRequired,
  query: PropTypes.shape({
    properties: PropTypes.object,
    search: PropTypes.string,
  }),
  rows: PropTypes.arrayOf(PropTypes.shape({
    anticipatable_volume_percentage: PropTypes.number,
    automatic_anticipation_days: PropTypes.string,
    automatic_anticipation_enabled: PropTypes.bool,
    automatic_anticipation_type: PropTypes.string,
    bank_account: PropTypes.shape({
      document_number: PropTypes.string,
      id: PropTypes.number,
      legal_name: PropTypes.string,
    }),
    date_created: PropTypes.string,
    date_updated: PropTypes.string,
    id: PropTypes.string,
    status: PropTypes.string,
    transfer_day: PropTypes.number,
    transfer_enabled: PropTypes.bool,
    transfer_interval: PropTypes.string,
  })).isRequired,
  selectedRows: PropTypes.arrayOf(PropTypes.number).isRequired,
  t: PropTypes.func.isRequired,
}

RecipientTable.defaultProps = {
  confirmationDisabled: true,
  filterOptions: [],
  query: {
    properties: {},
    search: '',
  },
}

export default RecipientTable
