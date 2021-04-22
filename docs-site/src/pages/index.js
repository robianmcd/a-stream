import React from 'react';
import clsx from 'clsx';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './index.module.css';
import HomepageFeatures from '../components/HomepageFeatures';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <h1 className="hero__title">{siteConfig.title}</h1>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/api-reference/a-stream">
            AStream Docs
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title}`}
      description="AStream Documentation">
      <HomepageHeader/>
      <main>
        <HomepageFeatures/>
        <div>
          <h1 className={styles.demoTitle}>Demo - Build a Typeahead</h1>
          <video controls className={styles.demoVideo} autoPlay loop muted>
            <source src="typeahead.mp4" type="video/mp4"/>
          </video>
        </div>
      </main>
    </Layout>
  );
}
