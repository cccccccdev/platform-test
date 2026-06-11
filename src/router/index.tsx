import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import OrchestrationLayout from '../components/OrchestrationLayout';
import IntegrationLayout from '../components/IntegrationLayout';
import NoSidebarLayout from '../components/NoSidebarLayout';
import HomePage from '../pages/home/HomePage';

// Channel Integration pages (no sidebar)
import ChannelListPage from '../pages/channel-integration/ChannelListPage';
import BasicInfoPage from '../pages/channel-integration/BasicInfoPage';
import BusinessTypePage from '../pages/channel-integration/BusinessTypePage';
import MatchCapabilityPage from '../pages/channel-integration/MatchCapabilityPage';
import ConfigAbilityListPage from '../pages/channel-integration/ConfigAbilityListPage';
import ConfigEditorPage from '../pages/channel-integration/ConfigEditorPage';
import CodeAbilityListPage from '../pages/channel-integration/CodeAbilityListPage';
import CodeGuidePage from '../pages/channel-integration/CodeGuidePage';
import AuthenticationPage from '../pages/channel-integration/AuthenticationPage';
import CredentialPage from '../pages/channel-integration/CredentialPage';

// Scene pages (existing)
import SceneListPage from '../pages/channel-integration/SceneListPage';
import SceneEditPage from '../pages/channel-integration/SceneEditPage';
import SceneDetailPage from '../pages/channel-integration/SceneDetailPage';
import ApiDebugPage from '../pages/channel-integration/ApiDebugPage';
import FlowEditorPage from '../pages/channel-integration/FlowEditorPage';
import TestPage from '../pages/channel-integration/TestPage';

// Process Orchestration pages (orchestration sidebar)
import L2DictionaryPage from '../pages/orchestration/L2DictionaryPage';
import L3LibraryListPage from '../pages/orchestration/L3LibraryListPage';
import L4LibraryListPage from '../pages/orchestration/L4LibraryListPage';
import MyTemplatesPage from '../pages/orchestration/MyTemplatesPage';

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

const router = createBrowserRouter([
  { index: true, element: <Navigate to="/home" replace /> },
  { path: '/home', element: <HomePage /> },

  // Channel Integration module (no sidebar)
  {
    element: <NoSidebarLayout />,
    children: [
      // Channel list
      { path: 'channel-integration', element: <ChannelListPage /> },

      // Channel sub-pages
      { path: 'channel-integration/:channelCode/business-type', element: <BusinessTypePage /> },
      { path: 'channel-integration/:channelCode/credential', element: <CredentialPage /> },
      { path: 'channel-integration/:channelCode/party', element: <div style={{ padding: 24 }}>Party Page - 待实现</div> },
      { path: 'channel-integration/:channelCode/country', element: <div style={{ padding: 24 }}>Country Page - 待实现</div> },
      { path: 'channel-integration/:channelCode/authentication', element: <AuthenticationPage /> },
      { path: 'channel-integration/:channelCode/basic-info', element: <BasicInfoPage /> },

      // Integration pages (with left sidebar navigation)
      {
        element: <IntegrationLayout />,
        children: [
          { path: 'channel-integration/:channelCode/integration', element: <ConfigAbilityListPage /> },
          { path: 'channel-integration/:channelCode/integration/match-capability', element: <MatchCapabilityPage /> },
          { path: 'channel-integration/:channelCode/integration/config', element: <ConfigAbilityListPage /> },
          { path: 'channel-integration/:channelCode/integration/config/test', element: <TestPage /> },
          { path: 'channel-integration/:channelCode/integration/config/:bt/:ability', element: <ConfigEditorPage /> },
          { path: 'channel-integration/:channelCode/integration/code', element: <CodeAbilityListPage /> },
          { path: 'channel-integration/:channelCode/integration/code/:bt/:ability', element: <CodeGuidePage /> },
        ],
      },

      // Flow Editor page (without sidebar - uses NoSidebarLayout)
      { path: 'channel-integration/:channelCode/integration/config/:bt/:ability/:stepIndex', element: <FlowEditorPage /> },

      // Scene pages (existing)
      { path: 'channel-integration/:channelCode/scenes', element: <SceneListPage /> },
      { path: 'channel-integration/:channelCode/scenes/:sceneId/modify', element: <SceneEditPage /> },
      { path: 'channel-integration/:channelCode/scenes/:sceneId/detail/:version', element: <SceneDetailPage /> },
      { path: 'channel-integration/:channelCode/scenes/:sceneId/api-debug', element: <ApiDebugPage /> },
      // Channel-level API Debug (no scene)
      { path: 'channel-integration/:channelCode/api-debug', element: <ApiDebugPage /> },
    ],
  },

  // Process Orchestration module (orchestration sidebar)
  {
    element: <OrchestrationLayout />,
    children: [
      { path: 'process-orchestration/l2-dictionary', element: <L2DictionaryPage /> },
      { path: 'process-orchestration/l3-library', element: <L3LibraryListPage /> },
      { path: 'process-orchestration/l4-library', element: <L4LibraryListPage /> },
      { path: 'process-orchestration/my-templates', element: <MyTemplatesPage /> },
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
          { path: 'capability', element: <CapabilityPage /> },
          { path: 'capability/stateMachine', element: <StateMachineListPage /> },
          { path: 'capability/link-state-machine', element: <LinkStateMachinePage /> },
          { path: 'stateMachine', element: <StateMachineListPage /> },
        ],
      },
    ],
  },
  // Standalone stateMachine canvas (no sidebar, outside AppShell)
  { path: 'basic-info/capability/stateMachine/canvas', element: <StateMachineCanvas /> },
]);

export default function Router() {
  return <RouterProvider router={router} />;
}