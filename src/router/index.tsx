import { createBrowserRouter, RouterProvider, Navigate, useParams } from 'react-router-dom';
import AppShell from '../components/AppShell';
import IntegrationLayout from '../components/IntegrationLayout';
import NoSidebarLayout from '../components/NoSidebarLayout';
import HomePage from '../pages/home/HomePage';

// Channel Integration pages (no sidebar)
import ChannelListPage from '../pages/channel-integration/ChannelListPage';
import BusinessTypePage from '../pages/channel-integration/BusinessTypePage';
import MatchCapabilityPage from '../pages/channel-integration/MatchCapabilityPage';
import MatchCapabilityEditorPage from '../pages/channel-integration/MatchCapabilityEditorPage';
import ConfigAbilityListPage from '../pages/channel-integration/ConfigAbilityListPage';
import ConfigEditorPage from '../pages/channel-integration/ConfigEditorPage';
import CodeAbilityListPage from '../pages/channel-integration/CodeAbilityListPage';
import CodeGuidePage from '../pages/channel-integration/CodeGuidePage';
import ChannelInfoPage from '../pages/channel-integration/ChannelInfoPage';
import RuntimeFlowCanvasPage from '../pages/channel-integration/RuntimeFlowCanvasPage';


// Scene pages (existing)
import SceneListPage from '../pages/channel-integration/SceneListPage';
import SceneEditPage from '../pages/channel-integration/SceneEditPage';
import SceneDetailPage from '../pages/channel-integration/SceneDetailPage';
import FlowEditorPage from '../pages/channel-integration/FlowEditorPage';
import TestPage from '../pages/channel-integration/TestPage';

// Basic Info pages (has sidebar)
import BasicInfoIndex from '../pages/basic-info/BasicInfoIndex';
import BasicInfoBusinessTypePage from '../pages/basic-info/BusinessTypePage';
import CurrencyPage from '../pages/basic-info/CurrencyPage';
import CountryPage from '../pages/basic-info/CountryPage';
import ExchangeRatePage from '../pages/basic-info/ExchangeRatePage';
import ProductPage from '../pages/basic-info/ProductPage';
import MerchantPage from '../pages/basic-info/MerchantPage';
import CapabilityPage from '../pages/basic-info/CapabilityPage';
import StateMachineListPage from '../pages/basic-info/capability/StateMachineListPage';
import LinkStateMachinePage from '../pages/basic-info/capability/LinkStateMachinePage';
import StateMachineCanvas from '../pages/basic-info/capability/stateMachine/StateMachineCanvas';

function ComingSoonPage({ title }: { title: string }) {
  return <div style={{ padding: 24 }}>{title} Page - 待实现</div>;
}

function IntegrationIndexRedirect() {
  const { channelCode = '' } = useParams();
  return <Navigate to={`/channel-integration/${channelCode}/integration/config/flow-groups`} replace />;
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
  return <Navigate to={`/channel-integration/${channelCode}/integration/config/flow-groups/${bt}/${ability}/versions/${versionId}${window.location.search}`} replace />;
}

function LegacyFlowDetailRedirect() {
  const { channelCode = '', bt = '', ability = '', versionId = '', flowId = '' } = useParams();
  return <Navigate to={`/channel-integration/${channelCode}/integration/config/flow-groups/${bt}/${ability}/versions/${versionId}/flows/${flowId}${window.location.search}`} replace />;
}

function LegacyRouteMatchingDetailRedirect() {
  const { channelCode = '', uriId = '', decisionVersionId = '' } = useParams();
  return <Navigate to={`/channel-integration/${channelCode}/integration/config/route-matching/${uriId}/versions/${decisionVersionId}${window.location.search}`} replace />;
}

const router = createBrowserRouter(
[
  { index: true, element: <Navigate to="/home" replace /> },
  { path: '/home', element: <HomePage /> },
  { path: '/channel', element: <Navigate to="/channel-integration" replace /> },

  // Channel Integration module (no sidebar)
  {
    element: <NoSidebarLayout />,
    children: [
      // Channel list
      { path: 'channel-integration', element: <ChannelListPage /> },

      // Channel sub-pages
      { path: 'channel-integration/:channelCode/business-type', element: <BusinessTypePage /> },
      { path: 'channel-integration/:channelCode/party', element: <div style={{ padding: 24 }}>Party Page - 待实现</div> },
      { path: 'channel-integration/:channelCode/country', element: <div style={{ padding: 24 }}>Country Page - 待实现</div> },
      { path: 'channel-integration/:channelCode/offline-info', element: <div style={{ padding: 24 }}>OfflineInfo Page - 待实现</div> },
      { path: 'channel-integration/:channelCode/channel-info', element: <ChannelInfoPage /> },
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

      // Scene pages (existing)
      { path: 'channel-integration/:channelCode/scenes', element: <SceneListPage /> },
      { path: 'channel-integration/:channelCode/scenes/:sceneId/modify', element: <SceneEditPage /> },
      { path: 'channel-integration/:channelCode/scenes/:sceneId/detail/:version', element: <SceneDetailPage /> },
      { path: 'channel-integration/:channelCode/scenes/:sceneId/api-debug', element: <div style={{ padding: 24 }}>AI Debug Page - 待实现</div> },
      // Channel-level AI Debug (no scene)
      { path: 'channel-integration/:channelCode/api-debug', element: <div style={{ padding: 24 }}>AI Debug Page - 待实现</div> },
    ],
  },

  // Basic Info module (app shell sidebar)
  {
    element: <AppShell />,
    children: [
      {
        path: 'basic-info',
        children: [
          { index: true, element: <BasicInfoIndex /> },
          { path: 'business-type', element: <BasicInfoBusinessTypePage /> },
          { path: 'currency', element: <CurrencyPage /> },
          { path: 'country', element: <CountryPage /> },
          { path: 'exchange-rate', element: <ExchangeRatePage /> },
          { path: 'product', element: <ProductPage /> },
          { path: 'merchant', element: <MerchantPage /> },
          { path: 'party', element: <ComingSoonPage title="Party" /> },
          { path: 'card-bin', element: <ComingSoonPage title="Card Bin" /> },
          { path: 'party-tenant', element: <ComingSoonPage title="Party & Tenant" /> },
          { path: 'institution-type', element: <ComingSoonPage title="Institution Type" /> },
          { path: 'institution', element: <ComingSoonPage title="Institution" /> },
          { path: 'segment', element: <ComingSoonPage title="Segment" /> },
          { path: 'response-code', element: <ComingSoonPage title="Response Code" /> },
          { path: 'application', element: <ComingSoonPage title="Application" /> },
          { path: 'service', element: <ComingSoonPage title="Service" /> },
          { path: 'capability', element: <CapabilityPage /> },
          { path: 'capability/features', element: <ComingSoonPage title="Capability Features" /> },
          { path: 'capability/spi', element: <ComingSoonPage title="Capability SPI" /> },
          { path: 'capability/stateMachine', element: <StateMachineListPage /> },
          { path: 'capability/link-state-machine', element: <LinkStateMachinePage /> },
          { path: 'stateMachine', element: <StateMachineListPage /> },
        ],
      },
    ],
  },
  // Standalone stateMachine canvas (no sidebar, outside AppShell)
  { path: 'basic-info/capability/stateMachine/canvas', element: <StateMachineCanvas /> },
  { path: '*', element: <Navigate to="/home" replace /> },
],
  { basename: import.meta.env.BASE_URL.replace(/\/$/, '') },
);

export default function Router() {
  return <RouterProvider router={router} />;
}
