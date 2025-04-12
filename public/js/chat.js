document.addEventListener('DOMContentLoaded', function() {
  const socket = io();
  const chatBox = document.getElementById('chat-box');
  const messageInput = document.getElementById('messageInput');
  const sendButton = document.getElementById('sendMessageButton');
  
  // Get user IDs from window.chatData
  const userId = window.chatData?.userId;
  const engineerId = window.chatData?.engineerId;
  const senderType = window.chatData?.senderType || 'user';
  const isEngineer = window.chatData?.isEngineer || false;

  if (!userId || !engineerId) {
    console.error('Missing user IDs');
    chatBox.innerHTML = '<div class="error">Error: Missing user information. Please refresh the page.</div>';
    return;
  }

  // Check if engineer is trying to message themselves
  if (isEngineer && userId === engineerId) {
    console.error('Engineer cannot message themselves');
    chatBox.innerHTML = '<div class="error">Error: Engineers cannot message themselves. Please select a user to chat with.</div>';
    document.getElementById('input-area').style.display = 'none';
    return;
  }

  console.log('Chat data:', { userId, engineerId, senderType, isEngineer });

  // Join the specific chat room with both IDs
  // Create a consistent room ID by sorting the IDs alphabetically
  const roomId = [userId, engineerId].sort().join('-');
  console.log('Joining room:', roomId);
  socket.emit('joinChatRoom', { userId, engineerId });
  
  // Also join the notification rooms
  if (isEngineer) {
    socket.emit('joinEngineerRoom', { engineerId });
  } else {
    socket.emit('joinUserRoom', { userId });
  }

  // Load existing messages
  function loadMessages() {
    fetch(`/messages/${userId}/${engineerId}`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(messages => {
        chatBox.innerHTML = '';
        messages.forEach(message => {
          appendMessage(message);
        });
        // Mark messages as read
        markMessagesAsRead();
      })
      .catch(error => {
        console.error('Error loading messages:', error);
        chatBox.innerHTML = '<div class="error">Error loading messages. Please try again.</div>';
      });
  }

  // Append a message to the chat box
  function appendMessage(message) {
    const messageContainer = document.createElement('div');
    messageContainer.className = `message-container ${message.senderType === 'user' ? 'self' : ''}`;
    
    const senderName = document.createElement('div');
    senderName.className = 'sender-name';
    senderName.textContent = message.senderName;
    
    const messageElement = document.createElement('div');
    messageElement.className = `message ${message.senderType === 'user' ? 'self' : ''}`;
    messageElement.textContent = message.content;
    
    messageContainer.appendChild(senderName);
    messageContainer.appendChild(messageElement);
    chatBox.appendChild(messageContainer);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  // Mark messages as read
  function markMessagesAsRead() {
    fetch('/mark-read', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        engineerId
      })
    })
    .catch(error => {
      console.error('Error marking messages as read:', error);
    });
  }

  // Handle sending messages
  sendButton.addEventListener('click', function() {
    const content = messageInput.value.trim();
    if (content) {
      // Check if engineer is trying to message themselves
      if (isEngineer && userId === engineerId) {
        console.error('Engineer cannot message themselves');
        showErrorAlert('Engineers cannot message themselves. Please select a user to chat with.');
        return;
      }

      const messageData = {
        userId,
        engineerId,
        content,
        senderType
      };

      console.log('Sending message:', messageData);

      fetch('/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messageData)
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        if (data.success) {
          // Don't append the message here, it will be handled by the socket event
          messageInput.value = '';
        } else {
          console.error('Error sending message:', data.error);
          showErrorAlert('Failed to send message. Please try again.');
        }
      })
      .catch(error => {
        console.error('Error sending message:', error);
        showErrorAlert('Failed to send message. Please try again.');
      });
    }
  });

  // Handle Enter key press
  messageInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      sendButton.click();
    }
  });

  // Handle incoming messages from socket
  socket.on('message', function(message) {
    console.log('Received message:', message);
    if ((message.userId === userId && message.engineerId === engineerId) ||
        (message.userId === engineerId && message.engineerId === userId)) {
      appendMessage(message);
      // Mark messages as read when receiving new ones
      markMessagesAsRead();
    }
  });

  // Load initial messages
  loadMessages();
}); 