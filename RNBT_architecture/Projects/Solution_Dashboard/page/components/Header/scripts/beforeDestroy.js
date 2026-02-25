/*
 * Header Component - beforeDestroy
 */

const { removeCustomEvents } = Wkit;

// ======================
// EVENT CLEANUP
// ======================

removeCustomEvents(this, this.customEvents);
this.customEvents = null;
