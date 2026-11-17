import mixpanel from 'mixpanel-browser';

const token = import.meta.env.VITE_MIXPANEL_TOKEN;

if (token) {
  mixpanel.init(token, {
    autocapture: false,
    track_pageview: false,
    persistence: 'localStorage',
  });
}

const track = (event: string, properties: Record<string, string> = {}) => {
  if (token) {
    mixpanel.track(event, properties);
  }
};

export const analytics = {
  track,

  trackPageView(path: string) {
    track('page_view', {
      path: path.replace(/\/\d+(?=\/|$)/g, '/:id') || '/',
    });
  },
};
