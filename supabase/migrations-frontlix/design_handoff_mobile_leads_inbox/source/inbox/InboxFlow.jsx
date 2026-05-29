// src/inbox-c/InboxFlow.jsx
// Eenvoudige flow-controller voor de standalone preview:
// houdt bij of we de inbox-lijst, chat-detail of search zien.

function InboxFlow({ dark }) {
  const t = makeATheme({ dark });
  const [view, setView] = React.useState({ name: 'list' });

  const open = (chatId) => setView({ name: 'chat', chatId });
  const openSearch = () => setView({ name: 'search' });
  const back = () => setView({ name: 'list' });

  return (
    <>
      {view.name === 'list' && (
        <InboxC t={t}
          onOpenChat={open}
          onOpenSearch={openSearch}
        />
      )}
      {view.name === 'chat' && (
        <ChatDetail leadId={view.chatId} dark={dark} onBack={back}/>
      )}
      {view.name === 'search' && (
        <InboxSearch t={t} dark={dark}
          onBack={back} onOpenChat={open}
        />
      )}
    </>
  );
}

window.InboxFlow = InboxFlow;
