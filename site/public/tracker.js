// PetFoodRate — analytics tracker
(function () {
  var SUPABASE_URL = "https://bhmmidfnovtkcxljjfpd.supabase.co";
  var SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJobW1pZGZub3Z0a2N4bGpqZnBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5OTU3NzAsImV4cCI6MjA5MTU3MTc3MH0.COETkvMmQ69Lw153RJ1OW6EeY0LX7Zv1w54BtAipsYE";
  var SESSION_KEY = "pfr_session_id";
  var UTM_KEY = "pfr_utm";
  var COUNTRY_KEY = "pfr_country";
  var cachedCountry = null;
  try { cachedCountry = sessionStorage.getItem(COUNTRY_KEY) || null; } catch (e) {}
  function fetchCountry() {
    return fetch("/cdn-cgi/trace", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.text() : null; })
      .then(function (txt) { if (!txt) return null; var m = txt.match(/^loc=([A-Z]{2})\s*$/m); return m ? m[1] : null; })
      .catch(function () { return null; });
  }
  function getSessionId() {
    try { var id = sessionStorage.getItem(SESSION_KEY); if (!id) { id = ("" + Date.now() + Math.random().toString(36).slice(2, 12)).replace(/\./g, ""); sessionStorage.setItem(SESSION_KEY, id); } return id; } catch (e) { return "no-storage-" + Date.now(); }
  }
  function extractDomain(url) { if (!url) return null; try { return new URL(url).hostname.replace(/^www\./, ""); } catch (e) { return null; } }
  function captureUtm() {
    try { var params = new URLSearchParams(location.search); var utm = { utm_source: params.get("utm_source"), utm_medium: params.get("utm_medium"), utm_campaign: params.get("utm_campaign"), utm_term: params.get("utm_term"), utm_content: params.get("utm_content") }; var has = false; for (var k in utm) if (utm[k]) { has = true; break; } if (has && !sessionStorage.getItem(UTM_KEY)) { sessionStorage.setItem(UTM_KEY, JSON.stringify(utm)); } } catch (e) {}
  }
  function getStoredUtm() { try { return JSON.parse(sessionStorage.getItem(UTM_KEY) || "{}"); } catch (e) { return {}; } }
  var lastInsertId = null, lastTimerStart = 0, lastPath = "";
  function uuid() { if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID(); return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16); }); }
  function post(endpoint, body) { return fetch(SUPABASE_URL + "/rest/v1/" + endpoint, { method: "POST", headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY, Prefer: "return=minimal" }, body: JSON.stringify(body) }); }
  function patch(endpoint, body) { return fetch(SUPABASE_URL + "/rest/v1/" + endpoint, { method: "PATCH", headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY, Prefer: "return=minimal" }, body: JSON.stringify(body), keepalive: true }); }
  function trackPageView() {
    var path = location.pathname; if (path === lastPath) return;
    if (lastInsertId && lastTimerStart) { patch("page_views?id=eq." + lastInsertId, { time_on_page_ms: Date.now() - lastTimerStart }).catch(function () {}); }
    captureUtm(); var utm = getStoredUtm(); var referrer = document.referrer || null; var newId = uuid();
    post("page_views", { id: newId, session_id: getSessionId(), surface: "site", path: path, title: document.title, referrer: referrer, referrer_domain: extractDomain(referrer), utm_source: utm.utm_source || null, utm_medium: utm.utm_medium || null, utm_campaign: utm.utm_campaign || null, utm_term: utm.utm_term || null, utm_content: utm.utm_content || null, user_agent: navigator.userAgent, screen_width: window.innerWidth, screen_height: window.innerHeight, locale: (navigator.language || "en").split("-")[0], country_code: cachedCountry }).catch(function () {});
    lastInsertId = newId; lastTimerStart = Date.now(); lastPath = path;
    if (!cachedCountry) { fetchCountry().then(function (cc) { if (!cc) return; cachedCountry = cc; try { sessionStorage.setItem(COUNTRY_KEY, cc); } catch (e) {} patch("page_views?id=eq." + newId, { country_code: cc }).catch(function () {}); }); }
  }
  function trackEvent(name, props) { post("analytics_events", { session_id: getSessionId(), surface: "site", event_name: name, properties: props || {}, path: location.pathname }).catch(function () {}); }
  window.addEventListener("beforeunload", function () { if (lastInsertId && lastTimerStart) { patch("page_views?id=eq." + lastInsertId, { time_on_page_ms: Date.now() - lastTimerStart }).catch(function () {}); } });
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden" && lastInsertId && lastTimerStart) { patch("page_views?id=eq." + lastInsertId, { time_on_page_ms: Date.now() - lastTimerStart }).catch(function () {}); } });
  trackPageView();
  window.pfr = { trackPageView: trackPageView, trackEvent: trackEvent, getSessionId: getSessionId };
})();
