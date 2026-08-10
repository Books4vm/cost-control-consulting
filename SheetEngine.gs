/**
 * CCC Scheduler
 * File: SheetEngine.gs
 *
 * Spreadsheet access, schema definitions, record helpers,
 * database initialization, and configuration population.
 */


/**
 * Returns the spreadsheet bound to the CCC Scheduler.
 */
function cccSpreadsheet_() {

  var spreadsheet =
    SpreadsheetApp.getActiveSpreadsheet();

  if (!spreadsheet) {
    throw new Error(
      "CCC Scheduler must be bound to CCC Database."
    );
  }

  return spreadsheet;
}


/**
 * Returns a required CCC sheet by name.
 */
function cccSheet_(sheetName) {

  var sheet =
    cccSpreadsheet_()
      .getSheetByName(sheetName);

  if (!sheet) {
    throw new Error(
      "Required sheet not found: " +
      sheetName
    );
  }

  return sheet;
}


/**
 * Reads row 1 and builds:
 *
 * list = ordered list of headers
 * map  = header name -> zero-based column index
 */
function cccHeaders_(sheetName) {

  var sheet =
    cccSheet_(sheetName);

  var lastColumn =
    sheet.getLastColumn();

  var headers =
    sheet
      .getRange(
        1,
        1,
        1,
        lastColumn
      )
      .getDisplayValues()[0];

  var map = {};


  headers.forEach(
    function (header, index) {

      if (header) {

        map[
          String(header).trim()
        ] = index;

      }

    }
  );


  return {
    list: headers,
    map: map
  };
}


/**
 * Appends an object using the actual sheet headers.
 *
 * Object property names must match the sheet headings.
 */
function cccAppendObject_(
  sheetName,
  object
) {

  var sheet =
    cccSheet_(sheetName);

  var headers =
    cccHeaders_(
      sheetName
    ).list;


  sheet.appendRow(

    headers.map(
      function (header) {

        return Object.prototype
          .hasOwnProperty.call(
            object,
            header
          )
          ? object[header]
          : "";

      }
    )

  );


  return sheet.getLastRow();
}


/**
 * Reads one row into an object using the header names.
 */
function cccReadObject_(
  sheetName,
  rowNumber
) {

  var sheet =
    cccSheet_(sheetName);

  var headers =
    cccHeaders_(
      sheetName
    ).list;

  var values =
    sheet
      .getRange(
        rowNumber,
        1,
        1,
        headers.length
      )
      .getValues()[0];

  var object = {};


  headers.forEach(
    function (header, index) {

      object[header] =
        values[index];

    }
  );


  return object;
}


/**
 * Updates named fields in an existing row.
 *
 * Fields that do not exist as current sheet headers are ignored.
 */
function cccUpdateObject_(
  sheetName,
  rowNumber,
  updates
) {

  var sheet =
    cccSheet_(sheetName);

  var headerMap =
    cccHeaders_(
      sheetName
    ).map;


  Object.keys(
    updates
  ).forEach(
    function (fieldName) {

      if (
        headerMap[fieldName] !==
        undefined
      ) {

        sheet
          .getRange(
            rowNumber,
            headerMap[fieldName] + 1
          )
          .setValue(
            updates[fieldName]
          );

      }

    }
  );
}


/**
 * WARNING:
 *
 * This function clears and rebuilds the CCC database sheets.
 *
 * DO NOT RUN THIS FUNCTION once production/test data that
 * must be retained exists.
 */
function initializeCCCSystem() {

  var lock =
    LockService.getScriptLock();

  lock.waitLock(
    CCC.LOCK_TIMEOUT_MS
  );


  try {

    var spreadsheet =
      cccSpreadsheet_();

    spreadsheet
      .setSpreadsheetTimeZone(
        CCC.TIME_ZONE
      );


    var definitions =
      cccDefinitions_();


    Object.keys(
      definitions
    ).forEach(
      function (sheetName) {

        var definition =
          definitions[sheetName];

        var sheet =
          spreadsheet
            .getSheetByName(
              sheetName
            ) ||
          spreadsheet.insertSheet(
            sheetName
          );


        /*
         * Ensure enough columns exist.
         */
        if (
          sheet.getMaxColumns() <
          definition.headers.length
        ) {

          sheet.insertColumnsAfter(

            sheet.getMaxColumns(),

            definition.headers.length -
            sheet.getMaxColumns()

          );

        }


        /*
         * WARNING:
         * This clears the sheet.
         */
        sheet.clear();


        /*
         * Write header row.
         */
        sheet
          .getRange(
            1,
            1,
            1,
            definition.headers.length
          )
          .setValues([
            definition.headers
          ])
          .setBackground(
            "#1f5d8f"
          )
          .setFontColor(
            "#fff"
          )
          .setFontWeight(
            "bold"
          )
          .setHorizontalAlignment(
            "center"
          )
          .setWrap(true);


        sheet.setFrozenRows(1);


        /*
         * Replace any existing filter.
         */
        if (
          sheet.getFilter()
        ) {
          sheet
            .getFilter()
            .remove();
        }


        sheet
          .getRange(
            1,
            1,
            Math.max(
              2,
              sheet.getMaxRows()
            ),
            definition.headers.length
          )
          .createFilter();


        /*
         * Apply configured widths.
         */
        definition.widths.forEach(
          function (
            width,
            index
          ) {

            sheet.setColumnWidth(
              index + 1,
              width
            );

          }
        );

      }
    );


    cccPopulateConfig_();


    cccAudit_({

      action:
        "INITIALIZE_DATABASE",

      module:
        "SheetEngine",

      recordType:
        "Spreadsheet",

      recordId:
        spreadsheet.getId(),

      result:
        "SUCCESS",

      details:
        "CCC Database initialized."

    });


    return cccResult_(

      true,

      {
        spreadsheetName:
          spreadsheet.getName(),

        spreadsheetId:
          spreadsheet.getId()
      },

      "CCC Database initialized."

    );


  } finally {

    lock.releaseLock();

  }
}


/**
 * Defines all CCC database sheet structures.
 *
 * IMPORTANT:
 * Current production headings use:
 *
 *   County
 *
 * instead of:
 *
 *   Country
 *
 * and:
 *
 *   Preferred Time for Ongoing Contact
 *
 * instead of:
 *
 *   Best Time to Contact
 */
function cccDefinitions_() {

  var definitions = {};


  /* ========================================================
     CONFIG
  ======================================================== */

  definitions[
    CCC.SHEETS.CONFIG
  ] = {

    headers: [

      "Setting",
      "Value",
      "Description"

    ],

    widths: [

      220,
      220,
      460

    ]

  };


  /* ========================================================
     CONSULTATION REQUESTS
  ======================================================== */

  definitions[
    CCC.SHEETS.REQUESTS
  ] = {

    headers: [

      "Request ID",
      "Submitted At",
      "Request Status",

      "First Name",
      "Last Name",
      "Job Title",

      "Company Name",
      "Legal Name",
      "DBA / Trade Name",

      "Business Type",
      "Industry",

      "Business Website",
      "LinkedIn Profile",

      "Address Line 1",
      "Address Line 2",
      "City",
      "State / Province",
      "ZIP / Postal Code",
      "County",

      "Email",
      "Phone",

      "Preferred Contact Method",
      "Preferred Time for Ongoing Contact",

      "Employee Range",
      "Annual Revenue Range",
      "Years in Business",

      "Accounting Software",
      "ERP System",
      "Payroll System",

      "Primary Area of Interest",
      "Business Challenges",
      "Business Challenge Description",
      "Desired Outcome",
      "Additional Information",

      "Consent to Contact",

      "Selected Slot Start",
      "Selected Slot End",

      "Appointment ID",
      "Calendar Event ID",

      "Source Page",
      "Submission Token",

      "Last Updated",
      "Internal Notes"

    ],

    widths:
      Array(43).fill(170)

  };


  /* ========================================================
     BUSINESSES
  ======================================================== */

  definitions[
    CCC.SHEETS.BUSINESSES
  ] = {

    headers: [

      "Business ID",

      "Company Name",
      "Legal Name",
      "DBA / Trade Name",

      "Business Type",
      "Industry",

      "Business Website",

      "Address Line 1",
      "Address Line 2",
      "City",
      "State / Province",
      "ZIP / Postal Code",
      "County",

      "Primary Contact First Name",
      "Primary Contact Last Name",
      "Job Title",

      "Email",
      "Phone",

      "Employee Range",
      "Annual Revenue Range",
      "Years in Business",

      "Accounting Software",
      "ERP System",
      "Payroll System",

      "First Request ID",
      "Latest Request ID",

      "Last Updated"

    ],

    widths:
      Array(27).fill(170)

  };


  /* ========================================================
     AVAILABLE SLOTS
  ======================================================== */

  definitions[
    CCC.SHEETS.SLOTS
  ] = {

    headers: [

      "Slot ID",
      "Slot Date",
      "Day",

      "Start Time",
      "End Time",

      "Slot Start",
      "Slot End",

      "Slot Status",
      "Blocking Reason",

      "Related Request ID",
      "Appointment ID",

      "Calendar Event ID",

      "Generated At",
      "Last Checked"

    ],

    widths:
      Array(14).fill(170)

  };


  /* ========================================================
     CONFIRMED APPOINTMENTS
  ======================================================== */

  definitions[
    CCC.SHEETS.APPOINTMENTS
  ] = {

    headers: [

      "Appointment ID",
      "Request ID",
      "Business ID",

      "Appointment Status",

      "Company Name",

      "Contact First Name",
      "Contact Last Name",
      "Contact Email",
      "Contact Phone",

      "Primary Area of Interest",
      "Business Challenges",

      "Appointment Date",

      "Start Time",
      "End Time",

      "Appointment Start",
      "Appointment End",

      "Time Zone",

      "Calendar Name",
      "Calendar Event ID",
      "Calendar Event URL",

      "Created At",
      "Confirmed At",
      "Cancelled At",

      "Last Updated",

      "Completion Notes",
      "Internal Notes"

    ],

    widths:
      Array(26).fill(175)

  };


  /* ========================================================
     AUDIT LOG
  ======================================================== */

  definitions[
    CCC.SHEETS.AUDIT
  ] = {

    headers: [

      "Log ID",
      "Timestamp",

      "Actor Type",
      "Actor Identifier",

      "Action",
      "Module",

      "Record Type",
      "Record ID",

      "Request ID",
      "Business ID",
      "Appointment ID",

      "Calendar Event ID",

      "Result",
      "Details",
      "Error Message",

      "Source Function"

    ],

    widths:
      Array(16).fill(180)

  };


  return definitions;
}


/**
 * Populates the Config sheet.
 */
function cccPopulateConfig_() {

  var rows = [

    [
      "System Name",
      CCC.SYSTEM_NAME,
      "Locked project name"
    ],

    [
      "Database Name",
      CCC.DATABASE_NAME,
      "Primary Google Sheet"
    ],

    [
      "Calendar Name",
      CCC.CALENDAR_NAME,
      "Authoritative calendar"
    ],

    [
      "Owner Email",
      CCC.OWNER_EMAIL,
      "Production owner"
    ],

    [
      "Time Zone",
      CCC.TIME_ZONE,
      "Pacific Time"
    ],

    [
      "Minimum Business-Day Lead",
      CCC.MIN_BUSINESS_DAYS,
      "Lead time"
    ],

    [
      "Booking Horizon Days",
      CCC.BOOKING_HORIZON_DAYS,
      "Future window"
    ],

    [
      "Slot Duration Minutes",
      CCC.SLOT_MINUTES,
      "Appointment duration"
    ],

    [
      "Buffer Minutes",
      CCC.BUFFER_MINUTES,
      "Gap before and after"
    ],

    [
      "Daily Start Time",
      "2:00 PM",
      "First start"
    ],

    [
      "Daily Final Start Time",
      "4:30 PM",
      "Last start"
    ],

    [
      "Initial Sequence Date",
      CCC.INITIAL_SEQUENCE_DATE,
      "Initial date"
    ],

    [
      "Initial Sequence Number",
      CCC.INITIAL_SEQUENCE_NUMBER,
      "Initial number"
    ]

  ];


  cccSheet_(
    CCC.SHEETS.CONFIG
  )
    .getRange(
      2,
      1,
      rows.length,
      3
    )
    .setValues(rows);

}