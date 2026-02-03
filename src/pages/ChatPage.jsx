import React from 'react';
import { Helmet } from 'react-helmet-async';
import ChatContainer from '../components/Chat/ChatContainer';
import { useChat } from '../hooks/useChat';
import { useCustomShan } from '../hooks/useCustomShan';
import { useProject } from '../hooks/useProject';

const SITE_ORIGIN = 'https://shannon-ai.com';

const ChatPage = () => {
  const { activeChatId } = useChat();
  const { activeCustomShan } = useCustomShan();
  const { activeProject } = useProject();
  const canonicalUrl = `${SITE_ORIGIN}/chat`;
  const socialImage = `${SITE_ORIGIN}/shannonbanner.png`;
  const pageTitle = 'Shannon AI Chat – Live Red-Team Workbench';
  const pageDescription =
    'Run live adversarial probes against Shannon AI to surface jailbreak paths, audit mitigation layers, and export defendable transcripts.';

  return (
    <div className="chat-page">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={socialImage} />
        <meta property="og:image:alt" content="Shannon AI red team threat banner" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={socialImage} />
        <meta name="twitter:image:alt" content="Shannon AI red team threat banner" />
      </Helmet>
      <ChatContainer key={`${activeChatId || 'new-chat'}-${activeCustomShan?.id || 'no-shan'}-${activeProject?.id || 'no-proj'}`} />
    </div>
  );
};

export default ChatPage;
