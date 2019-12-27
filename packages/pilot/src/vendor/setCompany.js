import { juxt } from 'ramda'
import { setCompany as appcuesSetCompany } from './appcues'
import { setCompany as gtmSetCompany } from './googleTagManager'
import { setCompany as fullStorySetCompany } from './fullStory'

/**
 * Set Company data in vendor SDK integrations
 *
 * @param {string} companyId company id
 * @param {string} companyName company name
 * @param {string} companyDateCreated company created date
 * @param {string} companyStatus company status
 * @param {string} companyType company type
 * @param {number} userId user id
 *
 */
export default juxt([
  appcuesSetCompany,
  gtmSetCompany,
  fullStorySetCompany,
])

