import buildResult from './result'
import fromRequest from './mocks/fromRequests.json'
import expectedResult from './mocks/expectedResultMock.json'
import fromRequestBoleto from './mocks/fromRequestsBoleto.json'
import expectedResultBoleto from './mocks/expectedResultBoleto.json'
import fromRequestAntifraud from './mocks/fromRequestsAntifraud.json'
import expectedResultAntifraud from './mocks/expectedResultAntifraud.json'
import fromRequestFraudCovered from './mocks/fromRequestsFraudCovered.json'
import expectedResultFraudCovered from './mocks/expectedResultFraudCovered.json'

describe('Transaction details', () => {
  it('should work when transaction, gatewayOperations, chargebackOperations, payables, company and status are returned', () => {
    expect(buildResult(fromRequest)).toBeJsonEqual(expectedResult)
  })

  it('should work when boleto has no payable', () => {
    expect(buildResult(fromRequestBoleto)).toBeJsonEqual(expectedResultBoleto)
  })

  it('should build result when pending manual review', () => {
    expect(buildResult(fromRequestAntifraud))
      .toBeJsonEqual(expectedResultAntifraud)
  })

  it('should build result when fraud covered', () => {
    expect(buildResult(fromRequestFraudCovered))
      .toBeJsonEqual(expectedResultFraudCovered)
  })
})
