import React, { Component } from 'react'
import PropTypes from 'prop-types'
import Form from 'react-vanilla-form'
import {
  Col,
  FormInput,
  Grid,
  Row,
} from 'former-kit'
import {
  always,
  complement,
  isEmpty,
  isNil,
  mapObjIndexed,
  unless,
} from 'ramda'

const replaceNilForString = num => unless(
  complement(isNil),
  always(''),
  num
)

const formatInitialData = mapObjIndexed(replaceNilForString)

class CompanyGeneralForm extends Component {
  constructor (props) {
    super(props)

    const initialFormData = formatInitialData(props.managingPartner)

    this.state = {
      currentFormData: initialFormData,
      initialFormData,
    }

    this.handleCancellation = this.handleCancellation.bind(this)
    this.handleFormChange = this.handleFormChange.bind(this)
    this.handleFormSubmit = this.handleFormSubmit.bind(this)
  }

  handleFormChange (data) {
    this.setState({
      currentFormData: data,
    })
  }

  handleCancellation () {
    const { initialFormData } = this.state

    this.setState({
      currentFormData: initialFormData,
    })
  }

  handleFormSubmit (data, formErrors) {
    const { onSubmit } = this.props

    if (isEmpty(formErrors)) {
      onSubmit(data)
    }
  }

  render () {
    const {
      t,
    } = this.props
    const { currentFormData } = this.state

    return (
      <Form
        customErrorProp="error"
        data={currentFormData}
        onSubmit={this.handleFormSubmit}
        onChange={this.handleFormChange}
      >
        <Grid>
          <Row>
            <Col palm={12} tablet={12} desk={4} tv={4}>
              <FormInput
                disabled
                label={t('pages.settings.company.card.register.managing_partner.form.name')}
                name="name"
                type="text"
              />
            </Col>
            <Col palm={12} tablet={12} desk={2} tv={2}>
              <FormInput
                disabled
                label={t('pages.settings.company.card.register.managing_partner.form.phone')}
                name="phone_number"
                type="text"
              />
            </Col>
            <Col palm={12} tablet={12} desk={2} tv={2}>
              <FormInput
                disabled
                label={t('pages.settings.company.card.register.managing_partner.form.cpf')}
                name="cpf"
                type="text"
              />
            </Col>
          </Row>
        </Grid>
      </Form>
    )
  }
}

CompanyGeneralForm.propTypes = {
  managingPartner: PropTypes.shape({
    cpf: PropTypes.string,
    email: PropTypes.string,
    name: PropTypes.string,
  }).isRequired,
  onSubmit: PropTypes.func,
  t: PropTypes.func,
}

CompanyGeneralForm.defaultProps = {
  onSubmit: data => data,
  t: t => t,
}

export default CompanyGeneralForm
