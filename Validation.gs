/**
 * CCC Scheduler
 * File: Validation.gs
 *
 * Normalizes and validates consultation booking data.
 */


/**
 * Validate email format.
 */
function cccValidEmail_(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}


/**
 * Normalize a visitor-entered website URL.
 *
 * Examples:
 *   www.company.com
 *       -> https://www.company.com
 *
 *   company.com
 *       -> https://company.com
 *
 *   https://company.com
 *       -> unchanged
 *
 *   blank
 *       -> blank
 */
function cccNormalizeUrl_(value) {

  var url = cccClean_(value, 240);

  if (!url) {
    return "";
  }

  if (!/^https?:\/\//i.test(url)) {
    url = "https://" + url;
  }

  return url;
}


/**
 * Final URL safety validation.
 *
 * Normally the URL has already been normalized before this
 * function is called.
 */
function cccValidUrl_(url) {

  return (
    !url ||
    /^https?:\/\/[^\s]+$/i.test(url)
  );
}


/**
 * Normalize the complete booking payload.
 */
function cccNormalizeBooking_(payload) {

  payload = payload || {};

  return {

    sessionToken:
      cccClean_(
        payload.sessionToken,
        120
      ),

    visitorId:
      cccClean_(
        payload.visitorId,
        120
      ),

    submissionToken:
      cccClean_(
        payload.submissionToken,
        120
      ),


    /*
     * CONTACT
     */

    firstName:
      cccClean_(
        payload.firstName,
        80
      ),

    lastName:
      cccClean_(
        payload.lastName,
        80
      ),

    jobTitle:
      cccClean_(
        payload.jobTitle,
        120
      ),

    email:
      cccEmail_(
        payload.email
      ),

    phone:
      cccClean_(
        payload.phone,
        40
      ),

    preferredContactMethod:
      cccClean_(
        payload.preferredContactMethod,
        80
      ),

    bestTimeToContact:
      cccClean_(
        payload.bestTimeToContact,
        100
      ),


    /*
     * BUSINESS
     */

    companyName:
      cccClean_(
        payload.companyName,
        180
      ),

    legalName:
      cccClean_(
        payload.legalName,
        180
      ),

    dbaTradeName:
      cccClean_(
        payload.dbaTradeName,
        180
      ),

    businessType:
      cccClean_(
        payload.businessType,
        100
      ),

    industry:
      cccClean_(
        payload.industry,
        120
      ),

    yearsInBusiness:
      cccClean_(
        payload.yearsInBusiness,
        40
      ),

    employeeRange:
      cccClean_(
        payload.employeeRange,
        80
      ),

    annualRevenueRange:
      cccClean_(
        payload.annualRevenueRange,
        100
      ),


    /*
     * BUSINESS ADDRESS
     */

    addressLine1:
      cccClean_(
        payload.addressLine1,
        180
      ),

    addressLine2:
      cccClean_(
        payload.addressLine2,
        180
      ),

    city:
      cccClean_(
        payload.city,
        100
      ),

    stateProvince:
      cccClean_(
        payload.stateProvince,
        100
      ),

    postalCode:
      cccClean_(
        payload.postalCode,
        30
      ),

    country:
      cccClean_(
        payload.country,
        80
      ),


    /*
     * ONLINE INFORMATION
     *
     * IMPORTANT:
     * Visitors do not need to type http:// or https://.
     */

    website:
      cccNormalizeUrl_(
        payload.website
      ),

    linkedInProfile:
      cccNormalizeUrl_(
        payload.linkedInProfile
      ),


    /*
     * ACCOUNTING / SYSTEMS
     */

    accountingSoftware:
      cccClean_(
        payload.accountingSoftware,
        140
      ),

    erpSystem:
      cccClean_(
        payload.erpSystem,
        140
      ),

    payrollSystem:
      cccClean_(
        payload.payrollSystem,
        140
      ),


    /*
     * CONSULTATION
     */

    primaryAreaOfInterest:
      cccClean_(
        payload.primaryAreaOfInterest,
        160
      ),

    businessChallenges:
      Array.isArray(
        payload.businessChallenges
      )
        ? payload.businessChallenges
            .map(
              function (value) {
                return cccClean_(
                  value,
                  100
                );
              }
            )
            .filter(Boolean)
            .slice(0, 20)
        : [],

    businessChallengeDescription:
      cccClean_(
        payload.businessChallengeDescription,
        4000
      ),

    desiredOutcome:
      cccClean_(
        payload.desiredOutcome,
        2500
      ),

    additionalInformation:
      cccClean_(
        payload.additionalInformation,
        2500
      ),


    /*
     * CONSENT
     */

    consentToContact:
      (
        payload.consentToContact === true ||
        String(
          payload.consentToContact
        ).toLowerCase() === "true"
      ),


    /*
     * SYSTEM INFORMATION
     */

    sourcePage:
      (
        cccClean_(
          payload.sourcePage,
          160
        ) ||
        "CCC Website"
      ),

    slotStart:
      cccParseDateTime_(
        payload.slotStart
      ),

    slotEnd:
      cccParseDateTime_(
        payload.slotEnd
      )

  };
}


/**
 * Validate normalized booking information.
 */
function cccValidateBooking_(booking) {

  var errors = [];


  /*
   * REQUIRED CONTACT INFORMATION
   */

  if (!booking.firstName) {
    errors.push(
      "First name is required."
    );
  }

  if (!booking.lastName) {
    errors.push(
      "Last name is required."
    );
  }

  if (
    !cccValidEmail_(
      booking.email
    )
  ) {
    errors.push(
      "A valid email address is required."
    );
  }


  /*
   * REQUIRED BUSINESS INFORMATION
   */

  if (!booking.companyName) {
    errors.push(
      "Company name is required."
    );
  }

  if (!booking.businessType) {
    errors.push(
      "Business type is required."
    );
  }

  if (!booking.industry) {
    errors.push(
      "Industry is required."
    );
  }


  /*
   * CONSULTATION
   */

  if (
    !booking.primaryAreaOfInterest
  ) {
    errors.push(
      "Primary service is required."
    );
  }

  if (
    !booking.businessChallengeDescription
  ) {
    errors.push(
      "Please describe the business challenge."
    );
  }


  /*
   * CONSENT
   */

  if (
    !booking.consentToContact
  ) {
    errors.push(
      "Consent to contact is required."
    );
  }


  /*
   * URL SAFETY CHECK
   *
   * The visitor does NOT need to supply the protocol.
   * cccNormalizeBooking_() adds https:// automatically.
   */

  if (
    !cccValidUrl_(
      booking.website
    )
  ) {
    errors.push(
      "Please enter a valid business website."
    );
  }

  if (
    !cccValidUrl_(
      booking.linkedInProfile
    )
  ) {
    errors.push(
      "Please enter a valid LinkedIn profile."
    );
  }


  /*
   * APPOINTMENT DURATION
   */

  if (
    (
      booking.slotEnd -
      booking.slotStart
    ) / 60000 !==
    CCC.SLOT_MINUTES
  ) {
    errors.push(
      "The selected appointment must be 30 minutes."
    );
  }


  /*
   * BUSINESS DAYS
   */

  if (
    cccIsWeekend_(
      booking.slotStart
    )
  ) {
    errors.push(
      "Appointments are available Monday through Friday only."
    );
  }


  /*
   * MINIMUM LEAD TIME
   */

  if (
    cccStartOfDay_(
      booking.slotStart
    ) <
    cccAddBusinessDays_(
      cccNow_(),
      CCC.MIN_BUSINESS_DAYS
    )
  ) {
    errors.push(
      "The selected date does not meet the two-business-day lead requirement."
    );
  }


  /*
   * PERMITTED DAILY SCHEDULE
   */

  var selectedMinutes =
    booking.slotStart.getHours() *
      60 +
    booking.slotStart.getMinutes();

  var firstMinutes =
    CCC.START_HOUR *
      60 +
    CCC.START_MINUTE;

  var finalMinutes =
    CCC.FINAL_START_HOUR *
      60 +
    CCC.FINAL_START_MINUTE;


  if (
    selectedMinutes <
      firstMinutes ||
    selectedMinutes >
      finalMinutes ||
    selectedMinutes % 30 !== 0
  ) {
    errors.push(
      "The selected time is outside the permitted schedule."
    );
  }


  /*
   * RETURN ALL VALIDATION ERRORS TOGETHER
   */

  if (errors.length) {
    throw new Error(
      errors.join(" ")
    );
  }
}
