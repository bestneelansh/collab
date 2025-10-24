import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import styles from "./Inbox.module.css";
import logo from "../assets/logo_second.png";

export default function Inbox() {
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchUsername, setSearchUsername] = useState("");
  useEffect(() => {
    if (!searchUsername.trim()) {
      setSearchResults([]);
      return;
    }

    const handler = setTimeout(async () => {
      const { data: users, error } = await supabase
        .from("users")
        .select("id, username")
        .ilike("username", `%${searchUsername}%`)
        .limit(5);

      if (!error) setSearchResults(users || []);
    }, 300);

    return () => clearTimeout(handler);
  }, [searchUsername]);

  const [searchResults, setSearchResults] = useState([]);
  const [sentMessageIds, setSentMessageIds] = useState(new Set());
  const messagesEndRef = useRef(null);
  const avatarColors = ["#f97316", "#10b981", "#8b5cf6", "#ec4899", "#3b82f6"];
  const [sidebarWidth, setSidebarWidth] = useState(300); // default sidebar width
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef(null);

  function updateNavHeight() {
    const nav = document.querySelector('.navbar');
    if (nav) document.documentElement.style.setProperty('--nav-height', `${nav.offsetHeight}px`);
  }

  useEffect(() => {
    updateNavHeight();
    window.addEventListener("resize", updateNavHeight);
    return () => window.removeEventListener("resize", updateNavHeight);
  }, []);

  // Drag-to-resize sidebar
  function startResizing(e) {
    setIsResizing(true);
  }

  useEffect(() => {
    function handleMouseMove(e) {
      if (!isResizing || !sidebarRef.current) return;
      const rect = sidebarRef.current.getBoundingClientRect();
      const newWidth = e.clientX - rect.left;
      setSidebarWidth(newWidth < 50 ? 0 : Math.min(newWidth, 300));
    }

    function handleMouseUp() {
      setIsResizing(false);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  // Get consistent avatar color
  function getAvatarColor(str) {
    const index = str
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0) % avatarColors.length;
    return avatarColors[index];
  }

  // Load user and conversations
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setUser(null);
      setUser(user);

      const { data: participantData } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id)
        .eq("deleted", false);

      const conversationIds = participantData?.map(p => p.conversation_id) || [];
      if (conversationIds.length === 0) return;

      const { data: otherParticipants } = await supabase
        .from("conversation_participants")
        .select("conversation_id, users(username)")
        .in("conversation_id", conversationIds)
        .neq("user_id", user.id);

      const conversationsWithOther = conversationIds.map(id => {
        const other = otherParticipants.find(p => p.conversation_id === id)?.users;
        return { id, otherUser: other || { username: "Direct Chat" } };
      });

      setConversations(conversationsWithOther);
    }
    load();
  }, []);

  // Auto-scroll to newest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Subscribe to messages for the active conversation only
  useEffect(() => {
    if (!activeConversation) return;

    const channel = supabase
      .channel(`messages-${activeConversation}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeConversation}`,
        },
        (payload) => {
          setMessages(prev => {
            if (prev.some(m => m.id === payload.new.id) || sentMessageIds.has(payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [activeConversation, sentMessageIds]);

  // Open conversation and fetch messages
  async function openConversation(convId) {
    setActiveConversation(convId);

    const { data } = await supabase
      .from("messages")
      .select("*, users(username)")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });

    setMessages(data || []);
  }

  // Send a message
  async function sendMessage() {
    if (!newMessage.trim() || !activeConversation) return;

    const tempMsg = {
      id: Date.now(),
      sender_id: user.id,
      content: newMessage,
      created_at: new Date().toISOString(),
    };

    // Add locally and track the temporary id
    setMessages(prev => [...prev, tempMsg]);
    setSentMessageIds(prev => new Set(prev).add(tempMsg.id));
    setNewMessage("");

    const { data, error } = await supabase.from("messages").insert({
      conversation_id: activeConversation,
      sender_id: user.id,
      content: tempMsg.content,
    }).select();

    if (error) console.error("Send failed:", error);
    else if (data?.length) {
      // Remove temp id once Supabase returns real id
      setSentMessageIds(prev => {
        const copy = new Set(prev);
        copy.delete(tempMsg.id);
        return copy;
      });
    }
  }

  // Start chat with username
  async function startChatWith(username) {
    if (!username.trim()) return;

    const { data: users } = await supabase
      .from("users")
      .select("*")
      .eq("username", username.trim());

    if (!users || users.length === 0) return alert("User not found");
    const otherUser = users[0];

    const { data: existing } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", otherUser.id);

    let convId = null;
    if (existing?.length) {
      const conv = existing.find(e => conversations.some(c => c.id === e.conversation_id));
      convId = conv?.conversation_id || null;
    }

    if (!convId) {
      const { data: newConv } = await supabase
        .from("conversations")
        .insert([{ title: "Direct Chat" }])
        .select("*")
        .single();

      await supabase.from("conversation_participants").insert([
        { conversation_id: newConv.id, user_id: user.id },
        { conversation_id: newConv.id, user_id: otherUser.id },
      ]);

      convId = newConv.id;
      setConversations(prev => [...prev, { id: newConv.id, otherUser }]);
    }

    setSearchUsername("");
    setSearchResults([]);
    openConversation(convId);
  }

  // Delete conversation
  async function deleteConversation(convId) {
    if (!user) return;

    await supabase
      .from("conversation_participants")
      .update({ deleted: true })
      .eq("conversation_id", convId)
      .eq("user_id", user.id);

    setConversations(prev => prev.filter(c => c.id !== convId));
    if (activeConversation === convId) setActiveConversation(null);
  }

  const activeOtherUser = conversations.find(c => c.id === activeConversation)?.otherUser;

  return (
    <div className={styles.inboxContainer}>
      {/* Sidebar */}
        <div
          ref={sidebarRef}
          className={styles.sidebar}
          style={{ width: `${sidebarWidth}px` }}
          onMouseEnter={() => sidebarWidth === 0 && setSidebarWidth(6)}
          onMouseLeave={() => sidebarWidth === 0 && setSidebarWidth(0)}
        >
        {/* Drag handle stays at the edge */}
        <div 
          className={styles.dragHandle} 
          onMouseDown={startResizing} 
        />
        <div className={sidebarWidth === 0 ? styles.collapsedContent : ""}>
        <h3 style={{marginBottom:"10px"}}>Conversations</h3>
        <div 
          className={styles.searchContainer}
        >
          <input
            type="text"
            plaaceholder="Type username..."
            value={searchUsername}
            onChange={(e) => setSearchUsername(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && searchResults.length > 0)
                startChatWith(searchResults[0].username);
            }}
            className={styles.searchInput}
          />

          {searchResults.length > 0 && (
            <ul className={styles.dropdown}>
              {searchResults.map(user => (
                <li
                  key={user.id}
                  onClick={() => startChatWith(user.username)}
                  className={styles.dropdownItem}
                >
                  {user.username}
                </li>
              ))}
            </ul>
          )}
        </div>
        {conversations.length === 0 ? (
          <p>No conversations yet</p>
        ) : (
          conversations.map(conv => (
            <div
              key={conv.id}
              className={`${styles.conversation} ${activeConversation === conv.id ? styles.active : ""}`}
            >
              <span
                className={styles.conversationTitle}
                onClick={() => openConversation(conv.id)}
              >
                <div
                  className={styles.conversationAvatar}
                  style={{ backgroundColor: getAvatarColor(conv.otherUser.username) }}
                >
                  {conv.otherUser.username.charAt(0).toUpperCase()}
                </div>
                {conv.otherUser.username}
              </span>
              <button
                className={styles.deleteBtn}
                onClick={() => deleteConversation(conv.id)}
              >
                🗑
              </button>
            </div>
          ))
        )}
      </div>
      </div>

      {/* Chat Window */}
      <div className={styles.chatWindow}>
        {activeConversation && activeOtherUser ? (
          <>
            <div className={styles.chatHeader}>
              <div
                className={styles.chatHeaderAvatar}
                style={{ backgroundColor: getAvatarColor(activeOtherUser.username) }}
              >
                {activeOtherUser.username.charAt(0).toUpperCase()}
              </div>
              <span className={styles.chatHeaderName}>{activeOtherUser.username}</span>
            </div>

            <div className={styles.messages}>
              {messages.map(msg => {
                let contentDisplay;

                try {
                  const parsed = JSON.parse(msg.content);
                  if (parsed.type === "hackathon_interest") {
                    contentDisplay = (
                      <div className={styles.hackathonInterestCard}>
                      Hey, I'm interested in your Hackathon :       
                        <p className={styles.hackathonTitle}>"{parsed.hackathonTitle}"</p>
                      </div>
                    );
                  } else {
                    contentDisplay = msg.content;
                  }
                } catch {
                  contentDisplay = msg.content; // normal text message
                }
                return (
                  <div
                    key={msg.id}
                    className={`${styles.message} ${msg.sender_id === user.id ? styles.self : styles.other}`}
                  >
                    {contentDisplay}
                    <span className={styles.messageTime}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className={styles.inputArea}>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault(); // Prevents adding a newline
                  sendMessage();
                }
              }}
            />
              <button onClick={sendMessage}>Send</button>
            </div>
          </>
        ) : (
          <div className={styles.placeholder}>
            <img src={logo} alt="Chat illustration" className={styles.placeholderImg} />
            <h2>Welcome to Chat</h2>
            <p>Start a conversation by selecting a chat or searching for a user.</p>
          </div>
        )}
      </div>
    </div>
  );
}
