/* eslint-disable no-undef */
import hasProperty from './hasProperty'

/**
 * Identify User in Appcues
 *
 * @param {number} userId user id
 * @param {string} userEmail user email
 * @param {string} userName user name
 * @param {string} userDateCreated account created date
 * @param {string} userPermission user permission
 * @param {string} environment current environment
 */
export const identify = (
  userId,
  userEmail,
  userName,
  userDateCreated,
  userPermission,
  environment
) => {
  if (hasProperty(window.Appcues)) {
    window.Appcues.identify(
      userId,
      {
        environment,
        userDateCreated,
        userEmail,
        userName,
        userPermission,
      }
    )
  }
}

/**
 * Set Company data in Appcues session
 *
 * @param {string} companyId company id
 * @param {string} companyName company name
 * @param {string} companyDateCreated company created date
 * @param {string} companyStatus company status
 * @param {string} companyType company type
 * @param {number} userId user id
 *
 */
export const setCompany = (
  companyId,
  companyName,
  companyDateCreated,
  companyStatus,
  companyType,
  userId
) => {
  if (hasProperty(window.Appcues)) {
    window.Appcues.identify(
      userId,
      {
        companyDateCreated,
        companyId,
        companyName,
        companyStatus,
        companyType,
      }
    )
  }
}

/**
 * Triggers appcues page change
 */
export const page = () => {
  if (hasProperty(window.Appcues)) {
    window.Appcues.page()
  }
}
