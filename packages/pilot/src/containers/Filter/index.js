import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'

import {
  Card,
  CardActions,
  CardContent,
  CardSection,
  Button,
  Tag,
  Row,
  Col,
  CheckboxGroup,
} from 'former-kit'

import Form from 'react-vanilla-form'

import ChevronDown32 from 'emblematic-icons/svg/ChevronDown32.svg'
import ChevronUp32 from 'emblematic-icons/svg/ChevronUp32.svg'

import {
  allPass,
  anyPass,
  complement,
  either,
  flatten,
  identity,
  ifElse,
  isEmpty,
  isNil,
  unless,
  is,
  of,
  join,
  map,
  mergeDeepLeft,
  pipe,
  values,
} from 'ramda'

import moment from 'moment-timezone'

import compileTags from './compileTags'
import style from './style.css'

const isNilOrEmpty = anyPass([isNil, isEmpty])

const getFilters = pipe(
  mergeDeepLeft,
  values,
  flatten
)

const ensureArray = unless(
  is(Array),
  of
)

const isDate = either(is(Date), moment.isMoment)

const formatIfDate = ifElse(
  isDate,
  date => moment(date).format('MM/DD/YYYY HH:mm:ss'),
  identity
)

const isNotDateObject = allPass([
  is(Object),
  complement(is(String)),
  complement(isDate),
])

export const stringifyDates = ifElse(
  isNotDateObject,
  map(property => stringifyDates(property)),
  formatIfDate
)

const Filters = ({
  children,
  confirmationDisabled,
  disabled,
  onChange,
  onClear,
  onConfirm,
  options,
  query,
  t,
}) => {
  const [collapsed, setCollapsed] = useState(true)
  const [selectedFilters, setSelectedFilters] = useState({})
  const [filterQuery, setFilterQuery] = useState(query)

  useEffect(() => {
    setFilterQuery(query)
  }, [query])

  useEffect(() => {
    const {
      filters: localFilters,
    } = filterQuery

    const {
      filters: urlFilters,
    } = query

    setSelectedFilters(
      getFilters(urlFilters, localFilters)
    )
  }, [filterQuery, query])

  const handleToogeMoreFilters = () => {
    setCollapsed(!collapsed)
  }

  const handleFiltersSubmit = (filters) => {
    setCollapsed(true)
    onConfirm(filters)
  }

  const handleFiltersChange = (NewQuery) => {
    setFilterQuery(NewQuery)
    onChange(NewQuery)
  }

  const renderChildrenInput = (input, index) => (
    React.cloneElement(input, {
      className: style.search,
      disabled,
      key: `${input.props.name}-${index}`,
    })
  )

  const renderToolbar = () => (
    <CardActions>
      {ensureArray(children).map(renderChildrenInput)}
      {!isNilOrEmpty(options)
        && (
          <Button
            disabled={disabled}
            relevance="low"
            fill="outline"
            iconAlignment="end"
            icon={collapsed
              ? <ChevronDown32 width={16} height={16} />
              : <ChevronUp32 width={16} height={16} />
            }
            onClick={handleToogeMoreFilters}
          >
            {t('components.filter.more')}
          </Button>
        )
      }
      <Button
        relevance="normal"
        onClick={onClear}
        fill="outline"
        disabled={isNilOrEmpty(query.search) && isNilOrEmpty(selectedFilters)}
      >
        {t('components.filter.reset')}
      </Button>

      <Button
        relevance="normal"
        disabled={confirmationDisabled || disabled}
        type="submit"
        fill="gradient"
      >
        {t('components.filter.apply')}
      </Button>
    </CardActions>
  )

  const renderOptions = () => {
    if (isNilOrEmpty(options) || collapsed) {
      return null
    }

    return (
      <CardContent>
        <CardSection>
          <CardContent>
            <fieldset name="filters">
              <Row flex>
                {options.map(({ items, key, name }) => (
                  <Col key={name}>
                    <div className={style.filtersTitle}>
                      {name}
                    </div>
                    <CheckboxGroup
                      columns={
                        items.length > 6
                          ? 2
                          : 1
                      }
                      disabled={disabled}
                      name={key}
                      options={items}
                      value={selectedFilters}
                    />
                  </Col>
                ))}
              </Row>
            </fieldset>
          </CardContent>
        </CardSection>
      </CardContent>
    )
  }

  const renderTags = () => {
    const {
      filters: localFilters,
    } = filterQuery

    const {
      filters: urlFilters,
    } = query

    const filters = mergeDeepLeft(urlFilters, localFilters)

    if (!collapsed || isNilOrEmpty(selectedFilters)) {
      return null
    }
    const tags = compileTags(options, filters)

    return (
      <CardContent className={style.selectedOptionsTags}>
        <span className={style.selectedOptionsTitle}>
          {t('components.filter.filtering_by')}&nbsp;
        </span>
        {tags.map(({ items, key, name }) => (
          !isNilOrEmpty(items)
            && (
              <Tag key={key}>
                <strong>{name}</strong>: {join(', ', items)}
              </Tag>
            )
        ))}
      </CardContent>
    )
  }

  return (
    <Card className={style.allowOverflow}>
      <Form
        data={filterQuery}
        onChange={handleFiltersChange}
        onSubmit={handleFiltersSubmit}
      >
        {renderToolbar()}
        {renderOptions()}
        {renderTags()}
      </Form>
    </Card>
  )
}

Filters.propTypes = {
  children: PropTypes.node.isRequired,
  confirmationDisabled: PropTypes.bool,
  disabled: PropTypes.bool,
  onChange: PropTypes.func,
  onClear: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(PropTypes.shape({
    items: PropTypes.arrayOf(PropTypes.shape({
      label: PropTypes.string,
      value: PropTypes.string,
    })),
    key: PropTypes.string,
    name: PropTypes.string,
  })),
  query: PropTypes.object, // eslint-disable-line
  t: PropTypes.func.isRequired,
}

Filters.defaultProps = {
  confirmationDisabled: true,
  disabled: false,
  onChange: () => null,
  options: [],
  query: {},
}

export default Filters
