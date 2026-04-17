/**
 * CSInterface.js — Minimal Adobe CEP bridge for Kinetia panel.
 * Wraps window.__adobe_cep__ (injected by AE host) with a clean API.
 * Reference: https://github.com/Adobe-CEP/CEP-Resources
 */

/* global __adobe_cep__ */

(function (global) {
  "use strict";

  var UNDEFINED       = "undefined";
  var ERR_UNKNOWN     = "Unknown error";

  // ── CSEvent ────────────────────────────────────────────────────────────────
  function CSEvent(type, scope, appId, extensionId) {
    this.type        = type;
    this.scope       = scope || "APPLICATION";
    this.appId       = appId || "";
    this.extensionId = extensionId || "";
    this.data        = "";
  }

  // ── SystemPath ─────────────────────────────────────────────────────────────
  var SystemPath = {
    APP:            "app",
    EXTENSION:      "extension",
    HOST_STARTUP:   "hostStartup",
    MY_DOCUMENTS:   "myDocuments",
    APPLICATION:    "application",
    USER_DATA:      "userData",
    USER_DESKTOP:   "userDesktop",
    HOST_APPLICATION: "hostApplication"
  };

  // ── CSInterface ────────────────────────────────────────────────────────────
  function CSInterface() {
    this._cep = (typeof __adobe_cep__ !== UNDEFINED) ? __adobe_cep__ : null;
  }

  /**
   * Evaluate an ExtendScript string in the AE engine.
   * @param {string} script
   * @param {function} [callback] — called with (result: string)
   */
  CSInterface.prototype.evalScript = function (script, callback) {
    if (this._cep) {
      this._cep.evalScript(script, callback || function () {});
    } else {
      // Dev fallback — no AE host available
      if (callback) callback("undefined");
    }
  };

  /**
   * Register an event listener.
   */
  CSInterface.prototype.addEventListener = function (type, listener, obj) {
    if (this._cep) {
      this._cep.addEventListener(type, listener, obj || null);
    }
  };

  /**
   * Remove an event listener.
   */
  CSInterface.prototype.removeEventListener = function (type, listener, obj) {
    if (this._cep) {
      this._cep.removeEventListener(type, listener, obj || null);
    }
  };

  /**
   * Dispatch an event to AE.
   */
  CSInterface.prototype.dispatchEvent = function (event) {
    if (this._cep) {
      var str = JSON.stringify(event);
      this._cep.dispatchEvent(str);
    }
  };

  /**
   * Get a system path by type.
   */
  CSInterface.prototype.getSystemPath = function (pathType) {
    if (this._cep) {
      var path = decodeURIComponent(this._cep.getSystemPath(pathType));
      return path;
    }
    return "";
  };

  /**
   * Open URL in the default browser.
   */
  CSInterface.prototype.openURLInDefaultBrowser = function (url) {
    if (this._cep) {
      this._cep.openURLInDefaultBrowser(url);
    } else {
      window.open(url, "_blank");
    }
  };

  /**
   * Get host environment info.
   */
  CSInterface.prototype.getHostEnvironment = function () {
    if (this._cep) {
      return JSON.parse(this._cep.getHostEnvironment());
    }
    return null;
  };

  /**
   * Get application version.
   */
  CSInterface.prototype.getCurrentApiVersion = function () {
    if (this._cep) {
      return JSON.parse(this._cep.getCurrentApiVersion());
    }
    return { major: 10, minor: 0, micro: 0 };
  };

  /**
   * Close the extension.
   */
  CSInterface.prototype.closeExtension = function () {
    if (this._cep) {
      this._cep.closeExtension();
    }
  };

  /**
   * Request file write access for a list of paths.
   */
  CSInterface.prototype.requestOpenSPFileForWrite = function (path) {
    if (this._cep) {
      this._cep.requestOpenSPFileForWrite(path);
    }
  };

  // Export
  global.CSInterface  = CSInterface;
  global.CSEvent      = CSEvent;
  global.SystemPath   = SystemPath;

}(typeof window !== "undefined" ? window : this));
