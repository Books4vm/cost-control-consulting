/**
 * CCC Scheduler
 * File: EmailEngine.gs
 *
 * Sends:
 * 1. Complete internal consultation record to CCC.
 * 2. Concise appointment confirmation to the client.
 */


function cccSendInternalEmail_(b, i) {

  GmailApp.sendEmail(
    CCC.OWNER_EMAIL,
    "NEW CONSULTATION REQUEST - " + i.appointmentId,
    "New consultation: " + i.appointmentId,
    {
      htmlBody:
        cccBuildInternalEmail_(b, i),

      name:
        "Cost Control Consulting",

      replyTo:
        b.email
    }
  );

}


function cccSendClientEmail_(b, i) {

  GmailApp.sendEmail(
    b.email,
    "Your CCC consultation is confirmed - " + i.appointmentId,
    "Confirmed: " + i.appointmentId,
    {
      htmlBody:
        cccBuildClientEmail_(b, i),

      name:
        "Cost Control Consulting",

      replyTo:
        CCC.OWNER_EMAIL
    }
  );

}


/**
 * Common branded email shell.
 */
function cccEmailShell_(title, body) {

  return (

    '<div style="margin:0;padding:24px;background:#eef7fd;font-family:Arial;color:#17324d">' +

      '<div style="max-width:760px;margin:auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #cfe5f5">' +

        '<div style="background:#9fd3f4;padding:24px 30px;border-bottom:5px solid #1f5d8f">' +

          '<div style="font-size:27px;font-weight:700;color:#123f60">' +
            'Cost Control Consulting' +
          '</div>' +

          '<div>' +
            'Clarity. Confidence. Compliance.' +
          '</div>' +

        '</div>' +


        '<div style="padding:30px">' +

          '<h1 style="color:#123f60;margin-top:0">' +
            cccEscapeHtml_(title) +
          '</h1>' +

          body +

        '</div>' +


        '<div style="padding:18px 30px;background:#123f60;color:#fff">' +
          'Cost Control Consulting' +
        '</div>' +

      '</div>' +

    '</div>'

  );

}


/**
 * Complete internal appointment record.
 *
 * This email is intentionally comprehensive so CCC can
 * review the consultation without needing to open the
 * backend spreadsheet during normal appointment handling.
 */
function cccBuildInternalEmail_(b, i) {


  function row(label, value) {

    return (

      '<tr>' +

        '<td style="width:34%;padding:10px;font-weight:700;border-bottom:1px solid #ddd;vertical-align:top">' +
          cccEscapeHtml_(label) +
        '</td>' +

        '<td style="padding:10px;border-bottom:1px solid #ddd;vertical-align:top">' +
          cccEscapeHtml_(value || "") +
        '</td>' +

      '</tr>'

    );

  }


  function section(title) {

    return (

      '<tr>' +

        '<td colspan="2" style="padding:14px 10px 8px;background:#edf7fd;color:#123f60;font-weight:700;font-size:17px;border-top:2px solid #cfe5f5">' +
          cccEscapeHtml_(title) +
        '</td>' +

      '</tr>'

    );

  }


  function yesNo(value) {

    return value
      ? "Yes"
      : "No";

  }


  var rows = "";


  /* ========================================================
     APPOINTMENT DETAILS
  ======================================================== */

  rows += section(
    "Appointment Details"
  );


  rows += row(
    "Reference Number",
    i.appointmentId
  );


  rows += row(
    "Status",
    "Confirmed"
  );


  rows += row(
    "Appointment Date",
    cccLongDate_(b.slotStart)
  );


  rows += row(
    "Appointment Time",
    cccTime_(b.slotStart) +
      " - " +
      cccTime_(b.slotEnd)
  );


  rows += row(
    "Time Zone",
    "Pacific Time"
  );


  /* ========================================================
     CONTACT INFORMATION
  ======================================================== */

  rows += section(
    "Contact Information"
  );


  rows += row(
    "First Name",
    b.firstName
  );


  rows += row(
    "Last Name",
    b.lastName
  );


  rows += row(
    "Job Title",
    b.jobTitle
  );


  rows += row(
    "Email",
    b.email
  );


  rows += row(
    "Phone",
    b.phone
  );


  rows += row(
    "Preferred Contact Method",
    b.preferredContactMethod
  );


  /*
   * IMPORTANT:
   * The backend field remains bestTimeToContact.
   * Only the human-readable label has changed.
   */
  rows += row(
    "Preferred Time for Ongoing Contact",
    b.bestTimeToContact
  );


  /* ========================================================
     BUSINESS INFORMATION
  ======================================================== */

  rows += section(
    "Business Information"
  );


  rows += row(
    "Company Name",
    b.companyName
  );


  rows += row(
    "Legal Name",
    b.legalName
  );


  rows += row(
    "DBA / Trade Name",
    b.dbaTradeName
  );


  rows += row(
    "Business Type",
    b.businessType
  );


  rows += row(
    "Industry",
    b.industry
  );


  rows += row(
    "Website",
    b.website
  );


  rows += row(
    "LinkedIn Profile",
    b.linkedInProfile
  );


  rows += row(
    "Employee Range",
    b.employeeRange
  );


  rows += row(
    "Annual Revenue Range",
    b.annualRevenueRange
  );


  rows += row(
    "Years in Business",
    b.yearsInBusiness
  );


  /* ========================================================
     BUSINESS ADDRESS
  ======================================================== */

  rows += section(
    "Business Address"
  );


  rows += row(
    "Address Line 1",
    b.addressLine1
  );


  rows += row(
    "Address Line 2",
    b.addressLine2
  );


  rows += row(
    "City",
    b.city
  );


  rows += row(
    "State / Province",
    b.stateProvince
  );


  rows += row(
    "ZIP / Postal Code",
    b.postalCode
  );


  rows += row(
    "Country",
    b.country
  );


  /* ========================================================
     ACCOUNTING AND BUSINESS SYSTEMS
  ======================================================== */

  rows += section(
    "Accounting and Business Systems"
  );


  rows += row(
    "Accounting Software",
    b.accountingSoftware
  );


  rows += row(
    "ERP System",
    b.erpSystem
  );


  rows += row(
    "Payroll System",
    b.payrollSystem
  );


  /* ========================================================
     CONSULTATION DETAILS
  ======================================================== */

  rows += section(
    "Consultation Details"
  );


  rows += row(
    "Primary Area of Interest",
    b.primaryAreaOfInterest
  );


  rows += row(
    "Business Challenges",
    Array.isArray(
      b.businessChallenges
    )
      ? b.businessChallenges.join(", ")
      : ""
  );


  rows += row(
    "Business Challenge Description",
    b.businessChallengeDescription
  );


  rows += row(
    "Desired Outcome",
    b.desiredOutcome
  );


  rows += row(
    "Additional Information",
    b.additionalInformation
  );


  /* ========================================================
     CONSENT AND SYSTEM INFORMATION
  ======================================================== */

  rows += section(
    "Consent and System Information"
  );


  rows += row(
    "Consent to Contact",
    yesNo(
      b.consentToContact
    )
  );


  rows += row(
    "Source Page",
    b.sourcePage
  );


  rows += row(
    "Submission Token",
    b.submissionToken
  );


  /* ========================================================
     BUILD INTERNAL EMAIL
  ======================================================== */

  var html =

    '<div style="margin-bottom:18px;padding:14px 16px;background:#eaf6fd;border-left:5px solid #1f5d8f;border-radius:8px">' +

      '<div style="font-size:14px;color:#50697d">' +
        'CCC Reference Number' +
      '</div>' +

      '<div style="font-size:24px;font-weight:700;color:#123f60">' +
        cccEscapeHtml_(i.appointmentId) +
      '</div>' +

    '</div>' +


    '<table style="width:100%;border-collapse:collapse;border:1px solid #ddd">' +

      rows +

    '</table>' +


    '<div style="margin-top:22px;padding:14px;background:#fff8e8;border:1px solid #ead7a4;border-radius:8px">' +

      '<strong>Internal Use:</strong> ' +

      'This email contains the complete consultation information submitted by the client for review and preparation before the appointment.' +

    '</div>';


  return cccEmailShell_(
    "New Consultation Appointment",
    html
  );

}


/**
 * Client confirmation email.
 *
 * The client receives a concise confirmation rather than
 * the full internal business-information record.
 */
function cccBuildClientEmail_(b, i) {

  return cccEmailShell_(

    "Your Consultation Is Confirmed",


    '<p>' +

      'Dear ' +
      cccEscapeHtml_(b.firstName) +
      ',' +

    '</p>' +


    '<p>' +

      'Thank you for contacting Cost Control Consulting.' +

    '</p>' +


    '<div style="padding:22px;background:#eaf6fd;border-radius:10px">' +

      '<strong style="font-size:24px">' +

        cccEscapeHtml_(
          i.appointmentId
        ) +

      '</strong>' +

      '<br><br>' +

      cccEscapeHtml_(
        cccLongDate_(b.slotStart)
      ) +

      '<br>' +

      cccEscapeHtml_(
        cccTime_(b.slotStart)
      ) +

      ' - ' +

      cccEscapeHtml_(
        cccTime_(b.slotEnd)
      ) +

      ' Pacific Time' +

    '</div>' +


    '<p>' +

      'We will review your information before the meeting so the consultation can be focused and productive.' +

    '</p>'

  );

}
