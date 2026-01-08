import ReactGA from 'react-ga4';

export const initGA = () => {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (measurementId) {
    ReactGA.initialize(measurementId);
  }
};

export const trackArticleSelect = (articleId: string, title: string, source: string) => {
  ReactGA.event('select_content', {
    content_type: 'article',
    item_id: articleId,
    item_name: title,
    source,
  });
};

export const trackZipSearch = (zipCode: string) => {
  ReactGA.event('search', {
    search_term: zipCode,
  });
};

