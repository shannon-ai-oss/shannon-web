import React, { Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import "./App.css";
import "./styles/shared.css";
import RouteLoader from "./components/RouteLoader";
import NavigationLoader from "./components/NavigationLoader";
import lazyWithPreload from "@/utils/lazyWithPreload";

const LandingPage = lazyWithPreload(() => import("./pages/LandingPage"));
const ChatPage = lazyWithPreload(() => import("./pages/ChatPage"));
const PlanPage = lazyWithPreload(() => import("./pages/PlanPage"));
const LoginPage = lazyWithPreload(() => import("./pages/LoginPage"));
const MemoryPage = lazyWithPreload(() => import("./pages/Memory"));
const SharedChatPage = lazyWithPreload(() => import("./pages/SharedChatPage"));
const ApiPage = lazyWithPreload(() => import("./pages/ApiPage"));
const ResearchIndexPage = lazyWithPreload(() => import("./pages/ResearchIndexPage"));
const ResearchArticlePage = lazyWithPreload(() => import("./pages/ResearchArticlePage"));
const CompanyPage = lazyWithPreload(() => import("./pages/CompanyPage"));
const PrivacyPage = lazyWithPreload(() => import("./pages/PrivacyPage"));
const DeleteAccountPage = lazyWithPreload(() => import("./pages/DeleteAccountPage"));
const CustomShanPage = lazyWithPreload(() => import("./pages/CustomShanPage"));
const CreateCustomShanPage = lazyWithPreload(() => import("./pages/CreateCustomShanPage"));
const DiscoverCustomShanPage = lazyWithPreload(() => import("./pages/DiscoverCustomShanPage"));
const SkillsPage = lazyWithPreload(() => import("./pages/SkillsPage"));
const CreateSkillPage = lazyWithPreload(() => import("./pages/CreateSkillPage"));
const DiscoverSkillsPage = lazyWithPreload(() => import("./pages/DiscoverSkillsPage"));
const ProjectsPage = lazyWithPreload(() => import("./pages/ProjectsPage"));
const CreateProjectPage = lazyWithPreload(() => import("./pages/CreateProjectPage"));
const ProjectDetailPage = lazyWithPreload(() => import("./pages/ProjectDetailPage"));
const ExplorePage = lazyWithPreload(() => import("./pages/ExplorePage"));
const ExploreSkillsPage = lazyWithPreload(() => import("./pages/ExploreSkillsPage"));
const ExploreSkillDetailPage = lazyWithPreload(() => import("./pages/ExploreSkillDetailPage"));
const ExploreAssistantsPage = lazyWithPreload(() => import("./pages/ExploreAssistantsPage"));
const ExploreAssistantDetailPage = lazyWithPreload(() => import("./pages/ExploreAssistantDetailPage"));

const ROUTE_PRELOADERS = [
  { pattern: /^\/$/, loaders: [LandingPage] },
  { pattern: /^\/login\/?$/, loaders: [LoginPage] },
  { pattern: /^\/chat\/?$/, loaders: [ChatPage] },
  { pattern: /^\/plan\/?$/, loaders: [PlanPage] },
  { pattern: /^\/memory\/?$/, loaders: [MemoryPage] },
  { pattern: /^\/api\/?$/, loaders: [ApiPage] },
  { pattern: /^\/share\/[^/]+\/?$/, loaders: [SharedChatPage] },
  { pattern: /^\/research\/?$/, loaders: [ResearchIndexPage] },
  { pattern: /^\/research\/[^/]+\/?$/, loaders: [ResearchArticlePage] },
  { pattern: /^\/company\/?$/, loaders: [CompanyPage] },
  { pattern: /^\/privacy\/?$/, loaders: [PrivacyPage] },
  { pattern: /^\/delete-account\/?$/, loaders: [DeleteAccountPage] },
  { pattern: /^\/custom-shan\/?$/, loaders: [CustomShanPage] },
  { pattern: /^\/custom-shan\/create\/?$/, loaders: [CreateCustomShanPage] },
  { pattern: /^\/custom-shan\/[^/]+\/edit\/?$/, loaders: [CreateCustomShanPage] },
  { pattern: /^\/custom-shan\/discover\/?$/, loaders: [CustomShanPage] },
  { pattern: /^\/custom-shan\/[^/]+\/?$/, loaders: [ExploreAssistantDetailPage] },
  { pattern: /^\/skills\/?$/, loaders: [SkillsPage] },
  { pattern: /^\/skills\/create\/?$/, loaders: [CreateSkillPage] },
  { pattern: /^\/skills\/[^/]+\/edit\/?$/, loaders: [CreateSkillPage] },
  { pattern: /^\/skills\/discover\/?$/, loaders: [DiscoverSkillsPage] },
  { pattern: /^\/projects\/?$/, loaders: [ProjectsPage] },
  { pattern: /^\/projects\/create\/?$/, loaders: [CreateProjectPage] },
  { pattern: /^\/projects\/[^/]+\/?$/, loaders: [ProjectDetailPage] },
  { pattern: /^\/explore\/?$/, loaders: [ExplorePage] },
  { pattern: /^\/explore\/skills\/?$/, loaders: [ExploreSkillsPage] },
  { pattern: /^\/explore\/skills\/[^/]+\/?$/, loaders: [ExploreSkillDetailPage] },
  { pattern: /^\/explore\/assistants\/?$/, loaders: [ExploreAssistantsPage] },
  { pattern: /^\/explore\/assistants\/[^/]+\/?$/, loaders: [ExploreAssistantDetailPage] },
];

const preloadLoaders = (loaders) =>
  Promise.all(
    loaders
      .map((loader) => {
        try {
          return loader.preload();
        } catch (err) {
          console.error("Failed to preload route module", err);
          return Promise.resolve();
        }
      })
      .filter(Boolean),
  );

export const preloadRouteForUrl = (url = "/") => {
  if (typeof url !== "string") {
    return Promise.resolve();
  }
  const trimmed = url.trim();
  for (const entry of ROUTE_PRELOADERS) {
    if (entry.pattern.test(trimmed)) {
      return preloadLoaders(entry.loaders);
    }
  }
  return preloadLoaders([LandingPage]);
};

function App() {
  return (
    <div className="App">
      <Suspense fallback={<RouteLoader label="Loading Shannon interface…" />}>
        <NavigationLoader />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<MainLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/chat" element={<ChatPage />} />
          <Route path="/share/:slug" element={<SharedChatPage />} />
          <Route path="/plan" element={<PlanPage />} />
          <Route path="/memory" element={<MemoryPage />} />
          <Route path="/api" element={<ApiPage />} />
          <Route path="/api/:section" element={<ApiPage />} />
          <Route path="/research" element={<ResearchIndexPage />} />
          <Route path="/research/:slug" element={<ResearchArticlePage />} />
          <Route path="/company" element={<CompanyPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/delete-account" element={<DeleteAccountPage />} />
          <Route path="/custom-shan" element={<CustomShanPage />} />
          <Route path="/custom-shan/create" element={<CreateCustomShanPage />} />
          <Route path="/custom-shan/:id/edit" element={<CreateCustomShanPage />} />
          <Route path="/custom-shan/discover" element={<CustomShanPage />} />
          <Route path="/custom-shan/:id" element={<ExploreAssistantDetailPage />} />
          <Route path="/skills" element={<SkillsPage />} />
          <Route path="/skills/create" element={<CreateSkillPage />} />
          <Route path="/skills/:id/edit" element={<CreateSkillPage />} />
          <Route path="/skills/discover" element={<DiscoverSkillsPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/create" element={<CreateProjectPage />} />
          <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/explore/skills" element={<ExploreSkillsPage />} />
          <Route path="/explore/skills/:id" element={<ExploreSkillDetailPage />} />
          <Route path="/explore/assistants" element={<ExploreAssistantsPage />} />
          <Route path="/explore/assistants/:id" element={<ExploreAssistantDetailPage />} />
        </Route>
      </Routes>
    </Suspense>
  </div>
);
}

export default App;
