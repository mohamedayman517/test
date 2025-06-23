document.addEventListener('DOMContentLoaded', function() {
  const chatBox = document.getElementById('chat-box');
  const messageInput = document.getElementById('messageInput');
  const sendMessageButton = document.getElementById('sendMessageButton');
  const chatList = document.getElementById('chat-list');
  
  // Get user IDs from window.chatData
  const userId = window.chatData?.userId;
  const userId1 = window.chatData?.userId1;
  const userId2 = window.chatData?.userId2;
  const isEngineer = window.chatData?.isEngineer === 'true';

  if (!userId) {
    console.error('Missing user ID');
    chatBox.innerHTML = '<div class="error">Error: Missing user information. Please refresh the page.</div>';
    return;
  }

  // Check if engineer is trying to message themselves
  if (isEngineer && userId1 === userId2) {
    console.error('Engineer cannot message themselves');
    chatBox.innerHTML = '<div class="error">Error: Engineers cannot message themselves. Please select a user to chat with.</div>';
    if (document.getElementById('input-area')) {
      document.getElementById('input-area').style.display = 'none';
    }
    return;
  }

  console.log('Chat data:', { userId, userId1, userId2, isEngineer });

  // Function to add a message to the chat box
  function addMessage(message, isSelf) {
    const messageContainer = document.createElement('div');
    messageContainer.className = `message-container ${isSelf ? 'self' : ''}`;
    messageContainer.dataset.messageId = message._id;
    
    const senderName = document.createElement('div');
    senderName.className = 'sender-name';
    senderName.textContent = message.sender.name;
    
    const messageContent = document.createElement('div');
    messageContent.className = `message ${isSelf ? 'self' : ''}`;
    messageContent.textContent = message.content;
    
    const timestamp = document.createElement('div');
    timestamp.className = 'message-timestamp';
    timestamp.textContent = new Date(message.timestamp).toLocaleString();
    
    messageContainer.appendChild(senderName);
    messageContainer.appendChild(messageContent);
    messageContainer.appendChild(timestamp);
    chatBox.appendChild(messageContainer);
    
    // Scroll to bottom
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  // Function to send a message
  async function sendMessage() {
    const content = messageInput.value.trim();
    if (!content) return;

    try {
      const chatId = window.chatData.chatId;
      if (!chatId) {
        throw new Error('No chat ID available');
      }

      const response = await fetch(`/api/chats/${chatId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
      });

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/login';
          return;
        }
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      addMessage(data.message, true);
      messageInput.value = '';
      
      // Poll for new messages after sending
      loadMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    }
  }

  // Function to load messages
  async function loadMessages() {
    try {
      if (!userId1 || !userId2) {
        console.error('Missing user IDs for chat');
        return;
      }

      const response = await fetch(`/api/chat/${userId1}/${userId2}`);
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/login';
          return;
        }
        throw new Error('Failed to load messages');
      }

      const data = await response.json();
      
      // Store the chat ID for future use
      window.chatData.chatId = data._id;
      
      // Only clear and reload if we have new messages
      if (data.messages && data.messages.length > 0) {
        const lastMessage = chatBox.querySelector('.message-container:last-child');
        const lastMessageId = lastMessage?.dataset?.messageId;
        const newMessages = data.messages.filter(msg => 
          !lastMessageId || msg._id > lastMessageId
        );
        
        if (newMessages.length > 0) {
          if (!lastMessageId) {
            chatBox.innerHTML = '';
          }
          newMessages.forEach(message => {
            const isSelf = message.sender._id === userId;
            addMessage(message, isSelf);
          });
        }
      } else if (!chatBox.innerHTML.trim()) {
        chatBox.innerHTML = '<div class="no-messages">No messages yet. Start the conversation!</div>';
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      if (!chatBox.querySelector('.error')) {
        chatBox.innerHTML = '<div class="error">Error loading messages. Please try again.</div>';
      }
    }
  }

  // Function to load chat list
  async function loadChatList() {
    try {
      const response = await fetch(`/api/chats/user/${userId}`);
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/login';
          return;
        }
        throw new Error('Failed to load chat list');
      }

      const chats = await response.json();
      chatList.innerHTML = '';

      if (chats.length === 0) {
        chatList.innerHTML = '<div class="no-chats">No chats yet</div>';
        return;
      }

      chats.forEach(chat => {
        const chatItem = document.createElement('div');
        chatItem.className = 'chat-item';
        if (chat.otherParticipant._id === (userId2 || userId1)) {
          chatItem.classList.add('active');
        }
        
        chatItem.innerHTML = `
          <div class="chat-item-name">${chat.otherParticipant.name}</div>
          ${chat.lastMessage ? `
            <div class="chat-item-preview">
              <span class="preview-text">${chat.lastMessage.content}</span>
              <span class="preview-time">${new Date(chat.lastMessage.timestamp).toLocaleString()}</span>
            </div>
          ` : ''}
        `;
        chatItem.onclick = () => {
          window.location.href = `/chat/${userId}/${chat.otherParticipant._id}`;
        };
        chatList.appendChild(chatItem);
      });
    } catch (error) {
      console.error('Error loading chat list:', error);
      chatList.innerHTML = '<div class="error">Error loading chat list. Please try again.</div>';
    }
  }

  // Event listeners
  sendMessageButton.addEventListener('click', sendMessage);
  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Initialize
  if (userId1 && userId2) {
    loadMessages();
  }
  loadChatList();

  // Poll for new messages every 5 seconds if in a chat
  if (userId1 && userId2) {
    setInterval(loadMessages, 5000);
  }
}); 