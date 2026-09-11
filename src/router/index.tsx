import { lazy, Suspense } from 'react';
import { createHashRouter, RouterProvider, Navigate, useLocation, useParams } from 'react-router-dom';

const AppShell = lazy(() => import('../components/AppShell'));
const IntegrationLayout = lazy(() => import('../components/IntegrationLayout'));
const NoSidebarLayout = lazy(() => import('../components/NoSidebarLayout'));
const IntegrationDetailLayout = lazy(() => import('../components/IntegrationDetailLayout'));
const HomePage = lazy(() => import('../pages/home/HomePage'));

// Channel Integration pages (no sidebar)
const ChannelListPage = lazy(() => import('../pages/channel-integration/ChannelListPage'));
const MatchCapabilityPage = lazy(() => import('../pages/channel-integration/MatchCapabilityPage'));
const MatchCapabilityEditorPage = lazy(() => import('../pages/channel-integration/MatchCapabilityEditorPage'));
const ConfigAbilityListPage = lazy(() => import('../pages/channel-integration/ConfigAbilityListPage'));
const ConfigEditorPage = lazy(() => import('../pages/channel-integration/ConfigEditorPage'));
const CodeAbilityListPage = lazy(() => import('../pages/channel-integration/CodeAbilityListPage'));
const CodeGuidePage = lazy(() => import('../pages/channel-integration/CodeGuidePage'));
const ChannelInfoPage = lazy(() => import('../pages/channel-integration/ChannelInfoPage'));
const RuntimeFlowCanvasPage = lazy(() => import('../pages/channel-integration/RuntimeFlowCanvasPage'));
const MetadataPage = lazy(() => import('../pages/channel-integration/MetadataPage'));
const ConfigIntegrationOverviewPage = lazy(() => import('../pages/channel-integration/ConfigIntegrationOverviewPage'));
const ChannelProfilePage = lazy(() => import('../pages/channel-integration/ChannelProfilePage'));

// Scene pages (existing)
const SceneListPage = lazy(() => import('../pages/channel-integration/SceneListPage'));
const SceneEditPage = lazy(() => import('../pages/channel-integration/SceneEditPage'));
const SceneDetailPage = lazy(() => import('../pages/channel-integration/SceneDetailPage'));
const FlowEditorPage = lazy(() => import('../pages/channel-integration/FlowEditorPage'));
const TestPage = lazy(() => import('../pages/channel-integration/TestPage'));

// Basic Info pages (has sidebar)
const BasicInfoBusinessTypePage = lazy(() => import('../pages/basic-info/BusinessTypePage'));
const CurrencyPage = lazy(() => import('../pages/basic-info/CurrencyPage'));
const CountryPage = lazy(() => import('../pages/basic-info/CountryPage'));
const InstitutionTypePage = lazy(() => import('../pages/basic-info/InstitutionTypePage'));
const InstitutionPage = lazy(() => import('../pages/basic-info/InstitutionPage'));
const ExchangeRatePage = lazy(() => import('../pages/basic-info/ExchangeRatePage'));
const ProductPage = lazy(() => import('../pages/basic-info/ProductPage'));
const MerchantPage = lazy(() => import('../pages/basic-info/MerchantPage'));
const CapabilityPage = lazy(() => import('../pages/basic-info/CapabilityPage'));
const ServicePage = lazy(() => import('../pages/basic-info/ServicePage'));
const ServiceCapabilityPage = lazy(() => import('../pages/basic-info/ServiceCapabilityPage'));
const ServiceFieldMappingPage = lazy(() => import('../pages/basic-info/ServiceFieldMappingPage'));
const ServiceApiPage = lazy(() => import('../pages/basic-info/ServiceApiPage'));
const ServiceApiLimitPage = lazy(() => import('../pages/basic-info/ServiceApiLimitPage'));
const StateMachineListPage = lazy(() => import('../pages/basic-info/capability/StateMachineListPage'));
const LinkStateMachinePage = lazy(() => import('../pages/basic-info/capability/LinkStateMachinePage'));
const StateMachineCanvas = lazy(() => import('../pages/basic-info/capability/stateMachine/StateMachineCanvas'));
const CapabilityFeaturesPage = lazy(() => import('../pages/basic-info/capability/CapabilityFeaturesPage'));
const CapabilitySpiPage = lazy(() => import('../pages/basic-info/capability/CapabilitySpiPage'));

const TestCenterPage = lazy(() => import('../pages/tests/TestCenterPage'));
const ContextInspectorPage = lazy(() => import('../pages/inspector/ContextInspectorPage'));

function ComingSoonPage({ title }: { title: string }) {
  return <div style={{ padding: 24 }}>{title} Page - 待实现</div>;
}

function IntegrationIndexRedirect() {
  const { channelCode = '' } = useParams();
  return <Navigate to={`/channel-integration/${channelCode}/integration/config/overview`} replace />;
}

function LegacyRouteMatchingRedirect() {
  const { channelCode = '' } = useParams();
  return <Navigate to={`/channel-integration/${channelCode}/integration/config/route-matching`} replace />;
}

function LegacyFlowGroupsRedirect() {
  const { channelCode = '' } = useParams();
  return <Navigate to={`/channel-integration/${channelCode}/integration/config/flow-groups`} replace />;
}

function LegacyFlowGroupDetailRedirect() {
  const { channelCode = '', bt = '', ability = '', versionId = '' } = useParams();
  const { search } = useLocation();
  return <Navigate to={`/channel-integration/${channelCode}/integration/config/flow-groups/${bt}/${ability}/versions/${versionId}${search}`} replace />;
}

function LegacyFlowDetailRedirect() {
  const { channelCode = '', bt = '', ability = '', versionId = '', flowId = '' } = useParams();
  const { search } = useLocation();
  return <Navigate to={`/channel-integration/${channelCode}/integration/config/flow-groups/${bt}/${ability}/versions/${versionId}/flows/${flowId}${search}`} replace />;
}

function LegacyRouteMatchingDetailRedirect() {
  const { channelCode = '', uriId = '', decisionVersionId = '' } = useParams();
  const { search } = useLocation();
  return <Navigate to={`/channel-integration/${channelCode}/integration/config/route-matching/${uriId}/versions/${decisionVersionId}${search}`} replace />;
}

function RuntimeRouteMatchingTypoRedirect() {
  const { channelCode = '' } = useParams();
  return <Navigate to={`/channel-integration/${channelCode}/channel-info/runtime-control/route-matching`} replace />;
}

function LegacyMetadataRedirect() {
  const { channelCode = '' } = useParams();
  return <Navigate to={`/channel-integration/${channelCode}/integration/config/metadata`} replace />;
}

function LegacyChannelProfileRedirect({ section }: { section: string }) {
  const { channelCode = '' } = useParams();
  return <Navigate to={`/channel-integration/${channelCode}/channel-profile/${section}`} replace />;
}

const router = createHashRouter(
[
  { index: true, element: <Navigate to="/home" replace /> },
  { path: '/home', element: <HomePage /> },
  { path: '/operation-config', element: <ComingSoonPage title="Operation Config" /> },
  { path: '/channel', element: <Navigate to="/channel-integration" replace /> },
  { path: '/actions', element: <ComingSoonPage title="Action Library" /> },
  { path: '/tests', element: <TestCenterPage /> },
  { path: '/inspector', element: <ContextInspectorPage /> },
  { path: '/flow', element: <ComingSoonPage title="Flow" /> },
  { path: '/flow/editor/:flowId', element: <ComingSoonPage title="Flow Editor" /> },
  { path: '/channel-legacy', element: <Navigate to="/channel-integration" replace /> },
  { path: '/channel/:channelId', element: <ComingSoonPage title="Channel Detail" /> },
  { path: '/channel/:channelId/info', element: <ComingSoonPage title="Channel Info" /> },
  { path: '/channel/:channelId/scenario', element: <ComingSoonPage title="Channel Scenario" /> },
  { path: '/channel/:channelId/scenario/:scenarioId/edit', element: <ComingSoonPage title="Scenario Edit" /> },
  { path: '/channel/:channelId/scenario/:scenarioId/detail', element: <ComingSoonPage title="Scenario Detail" /> },
  { path: '/channel/:channelId/scenario/:scenarioId/deploy', element: <ComingSoonPage title="Scenario Deploy" /> },
  { path: '/channel/:channelId/scenario/:scenarioId/log', element: <ComingSoonPage title="Scenario Log" /> },
  { path: '/channel/:channelId/scenario/:scenarioId/control', element: <ComingSoonPage title="Scenario Control" /> },
  { path: '/scenario', element: <ComingSoonPage title="Scenario" /> },
  { path: '/process-orchestration/l2-dictionary', element: <ComingSoonPage title="L2 Dictionary" /> },
  { path: '/process-orchestration/l3-library', element: <ComingSoonPage title="L3 Library" /> },
  { path: '/process-orchestration/l4-library', element: <ComingSoonPage title="L4 Library" /> },
  { path: '/process-orchestration/my-templates', element: <ComingSoonPage title="My Templates" /> },

  // Channel Integration module (no sidebar)
  {
    element: <NoSidebarLayout />,
    children: [
      // Channel list
      { path: 'channel-integration', element: <ChannelListPage /> },

      // Channel sub-pages
      { path: 'channel-integration/:channelCode/business-type', element: <LegacyChannelProfileRedirect section="summary" /> },
      { path: 'channel-integration/:channelCode/party', element: <LegacyChannelProfileRedirect section="summary" /> },
      { path: 'channel-integration/:channelCode/country', element: <LegacyChannelProfileRedirect section="summary" /> },
      { path: 'channel-integration/:channelCode/offline-info', element: <LegacyChannelProfileRedirect section="integration-records" /> },
      { path: 'channel-integration/:channelCode/channel-profile/:section', element: <ChannelProfilePage /> },
      { path: 'channel-integration/:channelCode/metadata', element: <LegacyMetadataRedirect /> },
      { path: 'channel-integration/:channelCode/channel-info', element: <ChannelInfoPage /> },
      { path: 'channel-integration/:channelCode/channel-info/party/*', element: <ChannelInfoPage /> },
      { path: 'channel-integration/:channelCode/channel-info/institution', element: <ChannelInfoPage /> },
      { path: 'channel-integration/:channelCode/channel-info/chain', element: <ChannelInfoPage /> },
      { path: 'channel-integration/:channelCode/channel-info/asset-route', element: <ChannelInfoPage /> },
      { path: 'channel-integration/:channelCode/channel-info/service-channel', element: <ChannelInfoPage /> },
      { path: 'channel-integration/:channelCode/channel-info/runtime-control/route-matchina', element: <RuntimeRouteMatchingTypoRedirect /> },
      { path: 'channel-integration/:channelCode/channel-info/runtime-control/route-matching', element: <ChannelInfoPage /> },
      { path: 'channel-integration/:channelCode/channel-info/runtime-control/flow-groups', element: <ChannelInfoPage /> },
      { path: 'channel-integration/:channelCode/channel-info/runtime-control/route-matching/:uriId/versions/:decisionVersionId', element: <MatchCapabilityEditorPage /> },
      { path: 'channel-integration/:channelCode/channel-info/runtime-control/flow-groups/:bt/:ability/versions/:versionId', element: <ConfigEditorPage /> },
      { path: 'channel-integration/:channelCode/channel-info/runtime-control/flow-groups/:bt/:ability/versions/:versionId/flows/:flowId', element: <RuntimeFlowCanvasPage /> },


      // Integration pages (with left sidebar navigation)
      {
        element: <IntegrationLayout />,
        children: [
          { path: 'channel-integration/:channelCode/integration', element: <IntegrationIndexRedirect /> },
          { path: 'channel-integration/:channelCode/integration/match-capability', element: <LegacyRouteMatchingRedirect /> },
          { path: 'channel-integration/:channelCode/integration/config', element: <LegacyFlowGroupsRedirect /> },
          { path: 'channel-integration/:channelCode/integration/config/overview', element: <ConfigIntegrationOverviewPage /> },
          { path: 'channel-integration/:channelCode/integration/config/metadata', element: <MetadataPage /> },
          { path: 'channel-integration/:channelCode/integration/config/route-matching', element: <MatchCapabilityPage /> },
          { path: 'channel-integration/:channelCode/integration/config/flow-groups', element: <ConfigAbilityListPage /> },
          { path: 'channel-integration/:channelCode/integration/config/flow-groups/test', element: <TestPage /> },
          {
            path: 'channel-integration/:channelCode/integration/config/:bt/:ability/versions/:versionId',
            element: <LegacyFlowGroupDetailRedirect />,
          },
          {
            path: 'channel-integration/:channelCode/integration/config/flow-groups/:bt/:ability/versions/:versionId',
            element: <ConfigEditorPage />,
          },
          { path: 'channel-integration/:channelCode/integration/code', element: <CodeAbilityListPage /> },
          { path: 'channel-integration/:channelCode/integration/code/:bt/:ability', element: <CodeGuidePage /> },
        ],
      },

      // Flow Editor page (without sidebar - uses NoSidebarLayout)
      {
        element: <IntegrationDetailLayout />,
        children: [
          {
            path: 'channel-integration/:channelCode/integration/config/:bt/:ability/versions/:versionId/flows/:flowId',
            element: <LegacyFlowDetailRedirect />,
          },
          {
            path: 'channel-integration/:channelCode/integration/config/flow-groups/:bt/:ability/versions/:versionId/flows/:flowId',
            element: <FlowEditorPage />,
          },
          {
            path: 'channel-integration/:channelCode/integration/match-capability/:uriId/versions/:decisionVersionId',
            element: <LegacyRouteMatchingDetailRedirect />,
          },
          {
            path: 'channel-integration/:channelCode/integration/config/route-matching/:uriId/versions/:decisionVersionId',
            element: <MatchCapabilityEditorPage />,
          },
        ],
      },

      // Scene pages (existing)
      { path: 'channel-integration/:channelCode/scenes', element: <SceneListPage /> },
      { path: 'channel-integration/:channelCode/scenes/:sceneId/modify', element: <SceneEditPage /> },
      { path: 'channel-integration/:channelCode/scenes/:sceneId/detail/:version', element: <SceneDetailPage /> },
    ],
  },

  // Basic Info module (app shell sidebar)
  {
    element: <AppShell />,
    children: [
      {
        path: 'basic-info',
        children: [
          { index: true, element: <Navigate to="country" replace /> },
          { path: 'business-type', element: <BasicInfoBusinessTypePage /> },
          { path: 'currency', element: <CurrencyPage /> },
          { path: 'country', element: <CountryPage /> },
          { path: 'exchange-rate', element: <ExchangeRatePage /> },
          { path: 'product', element: <ProductPage /> },
          { path: 'merchant', element: <MerchantPage /> },
          { path: 'party', element: <ComingSoonPage title="Party" /> },
          { path: 'card-bin', element: <ComingSoonPage title="Card Bin" /> },
          { path: 'party-tenant', element: <ComingSoonPage title="Party & Tenant" /> },
          { path: 'institution-type', element: <InstitutionTypePage /> },
          { path: 'institution', element: <InstitutionPage /> },
          { path: 'segment', element: <ComingSoonPage title="Segment" /> },
          { path: 'response-code', element: <ComingSoonPage title="Response Code" /> },
          { path: 'application', element: <ComingSoonPage title="Application" /> },
          { path: 'service', element: <ServicePage /> },
          { path: 'service/capability', element: <ServiceCapabilityPage /> },
          { path: 'service/capability/field-mapping', element: <ServiceFieldMappingPage /> },
          { path: 'service/api', element: <ServiceApiPage /> },
          { path: 'service/api-limit', element: <ServiceApiLimitPage /> },
          { path: 'capability', element: <CapabilityPage /> },
          { path: 'capability/features', element: <CapabilityFeaturesPage /> },
          { path: 'capability/spi', element: <CapabilitySpiPage /> },
          { path: 'capability/stateMachine', element: <StateMachineListPage /> },
          { path: 'capability/link-state-machine', element: <LinkStateMachinePage /> },
          { path: 'capability/stateMachine/canvas', element: <StateMachineCanvas /> },
          { path: 'stateMachine', element: <StateMachineListPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/home" replace /> },
]);

export default function Router() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading...</div>}>
      <RouterProvider router={router} />
    </Suspense>
  );
}
