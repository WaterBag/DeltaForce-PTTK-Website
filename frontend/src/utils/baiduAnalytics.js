import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const BAIDU_ANALYTICS_HOSTS = ['dfttk.com', 'www.dfttk.com'];

function canTrackBaiduAnalytics() {
  return typeof window !== 'undefined' && BAIDU_ANALYTICS_HOSTS.includes(window.location.hostname);
}

function getHmt() {
  if (!canTrackBaiduAnalytics()) {
    return null;
  }
  window._hmt = window._hmt || [];
  return window._hmt;
}

export function trackBaiduPageview(path) {
  const hmt = getHmt();
  if (!hmt || !path) {
    return;
  }
  hmt.push(['_trackPageview', path]);
}

export function trackBaiduEvent(category, action, label, value) {
  const hmt = getHmt();
  if (!hmt || !category || !action) {
    return;
  }
  const event = ['_trackEvent', category, action];
  if (label) {
    event.push(label);
  }
  if (Number.isFinite(value)) {
    event.push(value);
  }
  hmt.push(event);
}

export function useBaiduRouteTracking() {
  const location = useLocation();
  const previousPathRef = useRef(null);

  useEffect(() => {
    const path = `${location.pathname}${location.search}`;
    if (previousPathRef.current === path) {
      return;
    }
    previousPathRef.current = path;
    trackBaiduPageview(path);
  }, [location.pathname, location.search]);
}
