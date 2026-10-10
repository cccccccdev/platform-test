import { Breadcrumb, Tag } from 'antd';

const FlowLabel = ({ children }: { children: string }) => (
  <span className="integration-overview-flow-label">{children}</span>
);

export default function ConfigIntegrationOverviewPage() {
  return (
    <main className="integration-overview-page">
      <header className="integration-overview-heading">
        <Breadcrumb
          items={[
            { title: 'Channel Integration' },
            { title: 'Integration' },
            { title: 'Config Integration' },
            { title: 'Overview' },
          ]}
        />
        <h1>Config Integration Overview</h1>
        <p>From request-oriented Flow configuration to Ability-oriented Flow Group management.</p>
      </header>

      <div className="integration-overview-content">
        <section className="integration-overview-intro" aria-labelledby="overview-intro-title">
          <h2 id="overview-intro-title">How Config Integration has evolved</h2>
          <p>
            Config Integration 2.0 brings outbound and inbound business processing together under an
            Ability. Route Matching stays in front of callback traffic to identify which Ability should
            receive the request.
          </p>
          <div className="integration-overview-sample">
            <span>Sample</span>
            <strong>WALLET_DEBIT</strong>
            <i aria-hidden="true" />
            <strong>TRANSFER</strong>
            <i aria-hidden="true" />
            <span>TRANSACTION</span>
            <span>RE_QUERY</span>
            <span>CALLBACK</span>
          </div>
        </section>

        <section className="integration-concept-card" aria-labelledby="overview-v1-title">
          <div className="integration-concept-title">
            <span>1.0</span>
            <div>
              <h2 id="overview-v1-title">Complete Flows are separated by request direction</h2>
              <p>Outbound and inbound Flows are configured and managed in two separate modules.</p>
            </div>
          </div>

          <div className="integration-v1-directions" aria-hidden="true">
            <div><span>Gateway</span><b>→</b><span>Channel</span></div>
            <div><span>Channel</span><b>→</b><span>Gateway</span></div>
          </div>

          <div className="integration-v1-modules">
            <article className="integration-request-module">
              <h3>Outbound Request</h3>
              <div className="integration-v1-flow-stack">
                <div className="integration-purpose-flow">
                  <FlowLabel>TRANSACTION Flow</FlowLabel>
                  <strong>Place the wallet deposit order</strong>
                </div>
                <div className="integration-purpose-flow">
                  <FlowLabel>RE_QUERY Flow</FlowLabel>
                  <strong>Re-query the wallet deposit result</strong>
                </div>
              </div>
            </article>

            <article className="integration-request-module">
              <h3>Inbound Request</h3>
              <div className="integration-v1-flow-stack integration-v1-flow-stack-single">
                <div className="integration-purpose-flow">
                  <FlowLabel>CALLBACK Inbound Flow</FlowLabel>
                  <strong>Receive and process the wallet deposit result notification</strong>
                </div>
              </div>
            </article>
          </div>

          <p className="integration-concept-summary">
            Each Inbound Flow contains both request identification and complete business processing.
          </p>
        </section>

        <section className="integration-concept-card integration-concept-card-v2" aria-labelledby="overview-v2-title">
          <div className="integration-concept-title">
            <span>2.0</span>
            <div>
              <h2 id="overview-v2-title">Business Flows are unified by Ability</h2>
              <p>Trigger Type determines how each Flow in the Group starts.</p>
            </div>
          </div>

          <div className="integration-v2-diagram">
            <div className="integration-v2-sources" aria-label="Flow trigger sources">
              <div className="integration-source-header-spacer" aria-hidden="true" />
              <div className="integration-source-row integration-source-upstream">
                <span>Upstream Request</span><i aria-hidden="true" />
              </div>
              <div className="integration-source-row integration-source-requery">
                <span>Re-query trigger</span><i aria-hidden="true" />
              </div>
              <div className="integration-route-path">
                <div className="integration-uri-source"><span>URI</span><i aria-hidden="true" /></div>
                <div className="integration-route-box">
                  <strong>Route Matching</strong>
                  <small>Business Type + Ability</small>
                  <b>WALLET_DEBIT + TRANSFER</b>
                </div>
                <div className="integration-route-output">
                  <span>Find CALLBACK_TRIGGERED Flow in the matched Group</span>
                  <i aria-hidden="true" />
                </div>
              </div>
            </div>

            <article className="integration-flow-group">
              <h3>Flow Group · WALLET_DEBIT + TRANSFER</h3>
              <div className="integration-group-flow-list">
                <div className="integration-group-flow">
                  <FlowLabel>TRANSACTION Flow</FlowLabel>
                  <Tag>Trigger Type: UPSTREAM_TRIGGERED</Tag>
                  <strong>Place the wallet deposit order</strong>
                </div>
                <div className="integration-group-flow">
                  <FlowLabel>RE_QUERY Flow</FlowLabel>
                  <Tag>Trigger Type: REQUERY_TRIGGERED</Tag>
                  <strong>Re-query the wallet deposit result</strong>
                </div>
                <div className="integration-group-flow">
                  <FlowLabel>CALLBACK Flow</FlowLabel>
                  <Tag>Trigger Type: CALLBACK_TRIGGERED</Tag>
                  <strong>Receive and process the wallet deposit result notification</strong>
                </div>
              </div>
            </article>
          </div>

          <div className="integration-responsibility-note">
            <div><strong>Route Matching</strong><span>URI in, Business Type + Ability out</span></div>
            <div><strong>Flow Groups</strong><span>Find the matching Trigger Type and process the business request</span></div>
          </div>
        </section>

      </div>
    </main>
  );
}
