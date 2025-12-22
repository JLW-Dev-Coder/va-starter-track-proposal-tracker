/* ============================================================================
   VA STARTER TRACK • PROPOSAL TRACKER EMBED
   File: src/embed.js
   Purpose:
   - Reads clientUID from DOM (SuiteDash CF-safe)
   - Builds Railway destination URLs
   - Binds [data-path] and [data-url] click handlers
   - Sends lightweight view/click events to Railway
   Domain (prod): https://va-starter-track-proposal-tracker-production.up.railway.app
============================================================================ */

(function () {
  "use strict";

  function getRailwayOrigin() {
    var fromWindow = window.Lentax && window.Lentax.railwayOrigin ? String(window.Lentax.railwayOrigin) : "";
    var origin = fromWindow || "https://va-starter-track-proposal-tracker-production.up.railway.app";
    return origin.replace(/\/+$/, "");
  }

  function getClientUID() {
    // Preferred: meta div rendered by SuiteDash in a normal HTML block
    var meta = document.getElementById("lentax-proposal-meta");
    if (meta) {
      var uid = meta.getAttribute("data-clientuid");
      if (uid && String(uid).trim()) return String(uid).trim();
    }

    // Fallback 1: any element with data-clientuid
    var any = document.querySelector("[data-clientuid]");
    if (any) {
      var uid2 = any.getAttribute("data-clientuid");
      if (uid2 && String(uid2).trim()) return String(uid2).trim();
    }

    // Fallback 2: window.Lentax.clientUID if it was set somehow
    if (window.Lentax && window.Lentax.clientUID && String(window.Lentax.clientUID).trim()) {
      return String(window.Lentax.clientUID).trim();
    }

    return "";
  }

  function safeJsonStringify(obj) {
    try {
      return JSON.stringify(obj);
    } catch (e) {
      return "{}";
    }
  }

  function postEvent(origin, eventName, payload) {
    var url = origin + "/va-starter-track/e/" + encodeURIComponent(eventName);

    try {
      fetch(url, {
        body: safeJsonStringify(payload),
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        method: "POST"
      }).catch(function () {});
    } catch (e) {
      // ignore
    }
  }

  function buildBase(origin, clientUID) {
    return origin + "/va-starter-track/p/" + encodeURIComponent(clientUID);
  }

  function normalizePath(path) {
    if (!path) return "";
    var p = String(path).trim();
    if (!p) return "";
    if (p[0] !== "/") p = "/" + p;
    return p;
  }

  function onNavClick(e, origin, clientUID) {
    var target = e.target && e.target.closest ? e.target.closest("[data-path],[data-url]") : null;
    if (!target) return;

    var url = target.getAttribute("data-url");
    var path = target.getAttribute("data-path");
    var label = target.getAttribute("data-label") || target.textContent || "";
    label = String(label).trim().slice(0, 120);

    var payload = {
      clientUID: clientUID,
      label: label
    };

    if (url && String(url).trim()) {
      e.preventDefault();
      payload.url = String(url).trim();
      postEvent(origin, "click", payload);
      window.location.href = payload.url;
      return;
    }

    var p = normalizePath(path);
    if (!p) return;

    e.preventDefault();
    payload.path = p;
    postEvent(origin, "click", payload);

    var base = buildBase(origin, clientUID);
    window.location.href = base + p;
  }

  function init() {
    var origin = getRailwayOrigin();
    var clientUID = getClientUID();

    if (!clientUID) {
      // No UID = no routing. Do nothing silently.
      return;
    }

    window.Lentax = window.Lentax || {};
    window.Lentax.clientUID = clientUID;
    window.Lentax.railwayOrigin = origin;

    postEvent(origin, "view", {
      clientUID: clientUID,
      page: "proposal"
    });

    document.addEventListener("click", function (e) {
      onNavClick(e, origin, clientUID);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
