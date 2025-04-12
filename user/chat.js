const socket = io("http://localhost:3000"); // الاتصال مع Socket.IO

const chatBox = document.getElementById("chat-box");
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendMessageButton");

// استخراج engineerId و userId من البيانات
const userId = window.chatData?.userId;
const engineerId = window.chatData?.engineerId;

// التحقق من صحة المعرفات
if (!userId || !engineerId) {
  console.error("Missing user IDs");
  chatBox.innerHTML = '<div class="error">Error: Missing user information. Please refresh the page.</div>';
  return;
}

const roomId = `${userId}-${engineerId}`; // معرف الغرفة

// جلب الرسائل السابقة عند تحميل الصفحة
function loadMessages() {
  if (!userId || !engineerId) {
    console.error("Cannot load messages: Missing user IDs");
    return;
  }

  fetch(`/messages/${userId}/${engineerId}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then((messages) => {
      if (Array.isArray(messages)) {
        chatBox.innerHTML = ''; // مسح الرسائل القديمة
        messages.forEach((message) => {
          const isSelf = message.senderType === 'user';
          displayMessage(message, isSelf ? "self" : "");
        });
        chatBox.scrollTop = chatBox.scrollHeight;
      } else {
        console.error('Invalid messages format:', messages);
        chatBox.innerHTML = '<div class="error">Error: Invalid message format received</div>';
      }
    })
    .catch((error) => {
      console.error("Error fetching messages:", error);
      chatBox.innerHTML = '<div class="error">Error loading messages. Please try again.</div>';
    });
}

// عرض الرسائل في الصفحة
const displayMessage = (message, className) => {
  const messageElement = document.createElement("div");
  messageElement.className = `message ${className}`;
  messageElement.textContent = message.content;
  chatBox.appendChild(messageElement);
  chatBox.scrollTop = chatBox.scrollHeight;
};

// إرسال رسالة
const sendMessage = () => {
  if (!userId || !engineerId) {
    console.error("Cannot send message: Missing user IDs");
    return;
  }

  const content = messageInput.value.trim();
  if (content) {
    const messageData = {
      userId,
      engineerId,
      content,
      senderType: 'user'
    };

    // حفظ الرسالة في قاعدة البيانات
    fetch("/messages/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messageData),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error('Network response was not ok');
        }
        return res.json();
      })
      .then((data) => {
        if (data.success) {
          messageInput.value = "";
          // إعادة تحميل الرسائل بعد إرسال رسالة جديدة
          loadMessages();
        } else {
          console.error("Error sending message:", data.error);
          showErrorAlert("Failed to send message. Please try again.");
        }
      })
      .catch((error) => {
        console.error("Error sending message:", error);
        showErrorAlert("Failed to send message. Please try again.");
      });
  }
};

// تحميل الرسائل عند فتح الشات
loadMessages();

sendButton.addEventListener("click", sendMessage);
messageInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

// الانضمام إلى الغرفة
socket.emit("joinRoom", { roomId });

// استقبال الرسائل في الوقت الفعلي
socket.on("message", (message) => {
  console.log("✅ Received message:", message);
  const isSelf = message.senderType === 'user';
  displayMessage(message, isSelf ? "self" : "");
});
