/**
 * CCC Scheduler
 * File: Config.gs
 *
 * Central system configuration.
 */

const CCC = {
  SYSTEM_NAME: "CCC scheduling sys",
  DATABASE_NAME: "CCC Database",
  CALENDAR_NAME: "CCC calendar",
  OWNER_EMAIL: "decomondial@gmail.com",
  TIME_ZONE: "America/Los_Angeles",

  // Booking rules
  MIN_BUSINESS_DAYS: 2,
  BOOKING_HORIZON_DAYS: 60,

  // Calendar presentation
  // Five complete calendar weeks are displayed to the visitor.
  CALENDAR_DISPLAY_DAYS: 35,

  // Appointment rules
  SLOT_MINUTES: 30,
  BUFFER_MINUTES: 30,

  START_HOUR: 14,
  START_MINUTE: 0,

  FINAL_START_HOUR: 16,
  FINAL_START_MINUTE: 30,

  // Confirmation-number sequence
  INITIAL_SEQUENCE_DATE: "20260806",
  INITIAL_SEQUENCE_NUMBER: 252,

  // Security/session controls
  SESSION_TTL_SECONDS: 3600,
  RATE_WINDOW_SECONDS: 900,
  RATE_MAX: 20,

  LOCK_TIMEOUT_MS: 30000,

  SHEETS: {
    CONFIG: "Config",
    REQUESTS: "Consultation Requests",
    BUSINESSES: "Businesses",
    SLOTS: "Available Slots",
    APPOINTMENTS: "Confirmed Appointments",
    AUDIT: "Audit Log"
  }
};
