// controllers/ChatController.js

const express = require('express');
const router = express.Router();
const Chat = require('../models/messageSchema');
const User = require('../models/userSchema');

// Middleware to check authentication
const checkAuth = (req, res, next) => {
    const userId = req.session?.user?._id;
    if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
    }
    req.userId = userId;
    next();
};

// Get a specific chat by ID
router.get('/chat/:chatId', checkAuth, async (req, res) => {
    try {
        const { chatId } = req.params;
        const userId = req.userId;

        // Find the chat and populate the participants and message senders
        const chat = await Chat.findById(chatId)
            .populate('participants', 'firstName lastName role')
            .populate('messages.sender', 'firstName lastName role');

        if (!chat) {
            return res.status(404).json({ error: 'Chat not found' });
        }

        // Check if the user is a participant in this chat
        const isParticipant = chat.participants.some(participant => 
            participant._id.toString() === userId
        );

        if (!isParticipant) {
            return res.status(403).json({ error: 'Not authorized to access this chat' });
        }

        // Format the chat data
        const formattedChat = {
            _id: chat._id,
            participants: chat.participants.map(participant => ({
                _id: participant._id,
                name: `${participant.firstName} ${participant.lastName}`,
                role: participant.role
            })),
            messages: chat.messages.map(message => ({
                _id: message._id,
                content: message.content,
                timestamp: message.timestamp,
                sender: {
                    _id: message.sender._id,
                    name: `${message.sender.firstName} ${message.sender.lastName}`,
                    role: message.sender.role
                }
            }))
        };

        res.status(200).json(formattedChat);
    } catch (error) {
        console.error('Error fetching chat:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create a new chat
router.post('/chats', checkAuth, async (req, res) => {
    try {
        const userId = req.userId;
        const receiverId = req.body.receiverId;

        if (!receiverId) {
            return res.status(400).json({ error: 'Receiver ID is required' });
        }

        // Check if a chat already exists between these participants
        const existingChat = await Chat.findOne({
            participants: { $all: [userId, receiverId] }
        });

        if (existingChat) {
            return res.status(200).json({ 
                message: 'Chat already exists', 
                chat: existingChat 
            });
        }

        const participants = [userId, receiverId];
        const chat = new Chat({ participants });
        await chat.save();

        res.status(201).json({ message: 'Chat created successfully', chat });
    } catch (error) {
        console.error('Error creating chat:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Send a message in a chat
router.post('/chats/:chatId/messages', checkAuth, async (req, res) => {
    try {
        const { chatId } = req.params;
        const userId = req.userId;
        const { content } = req.body;

        const chat = await Chat.findById(chatId);

        if (!chat) {
            return res.status(404).json({ error: 'Chat not found' });
        }

        // Check if the user is a participant in this chat
        const isParticipant = chat.participants.some(participant => 
            participant.toString() === userId
        );

        if (!isParticipant) {
            return res.status(403).json({ error: 'Not authorized to send messages in this chat' });
        }

        chat.messages.push({ 
            sender: userId, 
            content,
            timestamp: new Date()
        });
        await chat.save();

        // Populate the sender information for the new message
        const populatedChat = await Chat.findById(chatId)
            .populate('messages.sender', 'firstName lastName role');
        
        const newMessage = populatedChat.messages[populatedChat.messages.length - 1];
        const formattedMessage = {
            _id: newMessage._id,
            content: newMessage.content,
            timestamp: newMessage.timestamp,
            sender: {
                _id: newMessage.sender._id,
                name: `${newMessage.sender.firstName} ${newMessage.sender.lastName}`,
                role: newMessage.sender.role
            }
        };

        res.status(200).json({ message: 'Message sent successfully', message: formattedMessage });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get chats for a user
router.get('/chats/user/:userId', checkAuth, async (req, res) => {
    try {
        const userId = req.userId;
        const requestedUserId = req.params.userId;

        if (userId !== requestedUserId) {
            return res.status(403).json({ error: 'Not authorized to access these chats' });
        }

        const chats = await Chat.find({ 'participants': userId })
            .populate('participants', 'firstName lastName role')
            .populate('messages.sender', 'firstName lastName role');

        // Format the chats data
        const formattedChats = chats.map(chat => {
            const otherParticipant = chat.participants.find(
                participant => participant._id.toString() !== userId
            );

            return {
                _id: chat._id,
                otherParticipant: {
                    _id: otherParticipant._id,
                    name: `${otherParticipant.firstName} ${otherParticipant.lastName}`,
                    role: otherParticipant.role
                },
                lastMessage: chat.messages.length > 0 ? {
                    content: chat.messages[chat.messages.length - 1].content,
                    timestamp: chat.messages[chat.messages.length - 1].timestamp
                } : null
            };
        });

        res.status(200).json(formattedChats);
    } catch (error) {
        console.error('Error fetching user chats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get a chat between two users
router.get('/chat/:userId1/:userId2', checkAuth, async (req, res) => {
    try {
        const { userId1, userId2 } = req.params;
        const currentUserId = req.userId;

        // Check if the current user is one of the participants
        if (currentUserId !== userId1 && currentUserId !== userId2) {
            return res.status(403).json({ error: 'Not authorized to access this chat' });
        }

        // Find the chat between these two users
        let chat = await Chat.findOne({
            participants: { $all: [userId1, userId2] }
        })
        .populate('participants', 'firstName lastName role')
        .populate('messages.sender', 'firstName lastName role');

        if (!chat) {
            // If no chat exists, create a new one
            chat = new Chat({
                participants: [userId1, userId2]
            });
            await chat.save();

            // Populate the new chat
            chat = await Chat.findById(chat._id)
                .populate('participants', 'firstName lastName role');
        }

        // Get the other participant's details
        const otherParticipant = chat.participants.find(
            participant => participant._id.toString() !== currentUserId
        );

        // Format the chat data
        const formattedChat = {
            _id: chat._id,
            participants: chat.participants.map(participant => ({
                _id: participant._id,
                name: `${participant.firstName} ${participant.lastName}`,
                role: participant.role
            })),
            otherParticipant: {
                _id: otherParticipant._id,
                name: `${otherParticipant.firstName} ${otherParticipant.lastName}`,
                role: otherParticipant.role
            },
            messages: chat.messages.map(message => ({
                _id: message._id,
                content: message.content,
                timestamp: message.timestamp,
                sender: {
                    _id: message.sender._id,
                    name: `${message.sender.firstName} ${message.sender.lastName}`,
                    role: message.sender.role
                }
            }))
        };

        res.status(200).json(formattedChat);
    } catch (error) {
        console.error('Error fetching chat between users:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;