import React from 'react';
import clsx from 'clsx';
import styles from './HomepageFeatures.module.css';

const FeatureList = [
  {
    title: 'Reactive API',
    Svg: require('../../static/img/reactive-api.svg').default,
    description: (
      <>
        Build streams of event handlers that react to upstream events and send new events downstream.
      </>
    ),
  },
  {
    title: 'Promise API',
    Svg: require('../../static/img/promise-api.svg').default,
    description: (
      <>
        Run input data through a stream or section of a stream and get a promise back that resolves with the output data.
      </>
    ),
  },
  {
    title: 'State API',
    Svg: require('../../static/img/state-api.svg').default,
    description: (
      <>
        Each node in a stream keeps track of its own pending status and current state (ignoring obsolete events that resolve out of order).
      </>
    ),
  },
];

function Feature({Svg, title, description}) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} alt={title} />
      </div>
      <div className="text--center padding-horiz--md">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
