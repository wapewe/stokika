// In-App Messaging System
class InAppMessaging {
    constructor() {
        this.supabase = null;
        this.currentUserId = null;
        this.activeConversation = null;
        this.messagePollingInterval = null;
    }

    async init() {
        this.supabase = initSupabase();
        if (!this.supabase) throw new Error('Database connection failed');
        this.currentUserId = await this.getCurrentUserId();
        await this.loadMessagingInterface();
        this.startMessagePolling();
    }

    async getCurrentUserId() {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            return user?.id || null;
        } catch (error) {
            console.error('Error getting user ID:', error);
            return null;
        }
    }

    async loadMessagingInterface() {
        try {
            const container = document.getElementById('messagingContent') || document.createElement('div');
            container.innerHTML = XSSProtection.sanitize(`
                <div class="messaging-app">
                    <div class="messaging...debar">
                        <div class="messaging-header">
                            <h3>💬 Messages</h3>
                            <button class="btn-new-message" id="btnNewMessage">➕</button>
                        </div>
                        <div class="search-conversations">
                            <input type="text" id="conversationSearch" placeholder="Search conversations...">
                        </div>
                        <div class="conversations-list" id="conversationsList">
                            <div class="loading">Loading conversations...</div>
                        </div>
                    </div>
                    
                    <div class="messaging-main">
                        <div class="conversation-header" id="conversationHeader" style="display: none;">
                            <div class="participant-info">
                                <div class="participant-avatar">👤</div>
                                <div class="participant-details">
                                    <h4 id="participantName">Select a conversation</h4>
                                    <span id="participantStatus">offline</span>
                                </div>
                            </div>
                            <div class="conversation-actions">
                                <button class="btn-icon" id="btnCallParticipant" title="Call">📞</button>
                                <button class="btn-icon" id="btnVideoCall" title="Video Call">📹</button>
                                <button class="btn-icon" id="btnMoreOptions" title="More">⋯</button>
                            </div>
                        </div>
                        
                        <div class="messages-container" id="messagesContainer">
                            <div class="no-conversation">
                                <div class="no-conversation-icon">💬</div>
                                <h3>Select a conversation to start messaging</h3>
                                <p>Choose from existing conversations or start a new one</p>
                            </div>
                        </div>
                        
                        <div class="message-input-container" id="messageInputContainer" style="display: none;">
                            <div class="message-input">
                                <button class="btn-attachment" id="btnAttachment">📎</button>
                                <input type="text" id="messageInput" placeholder="Type a message..." maxlength="1000">
                                <button class="btn-emoji" id="btnEmoji">😊</button>
                                <button class="btn-send" id="btnSendMessage">➤</button>
                            </div>
                            <div class="typing-indicator" id="typingIndicator" style="display: none;">
                                <span id="typingUser">Someone</span> is typing...
                            </div>
                        </div>
                    </div>
                </div>
            `);

            this.attachEventListeners();
            await this.loadConversations();
        } catch (error) {
            console.error('Error loading messaging interface:', error);
            showUserMessage('Error loading messaging', 'error');
        }
    }

    attachEventListeners() {
        const newMessageBtn = document.getElementById('btnNewMessage');
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('btnSendMessage');
        const attachmentBtn = document.getElementById('btnAttachment');
        const searchInput = document.getElementById('conversationSearch');

        if (newMessageBtn) newMessageBtn.addEventListener('click', () => this.showNewMessageModal());
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.sendMessage();
            });
            messageInput.addEventListener('input', () => this.handleTyping());
        }
        if (sendBtn) sendBtn.addEventListener('click', () => this.sendMessage());
        if (attachmentBtn) attachmentBtn.addEventListener('click', () => this.showAttachmentOptions());
        if (searchInput) searchInput.addEventListener('input', () => this.searchConversations());
    }

    async loadConversations() {
        try {
            if (!this.currentUserId) {
                document.getElementById('conversationsList').innerHTML = XSSProtection.sanitize('<p>Please log in to view messages</p>');
                return;
            }

            const { data: conversations } = await this.supabase
                .from('conversations')
                .select(`
                    *,
                    participant_1_user:users!conversations_participant_1_fkey(id, name, user_type),
                    participant_2_user:users!conversations_participant_2_fkey(id, name, user_type),
                    messages(message_text, created_at, is_read, sender_id)
                `)
                .or(`participant_1.eq.${this.currentUserId},participant_2.eq.${this.currentUserId}`)
                .order('last_message_at', { ascending: false });

            this.renderConversations(conversations || []);
        } catch (error) {
            console.error('Error loading conversations:', error);
        }
    }

    renderConversations(conversations) {
        const container = document.getElementById('conversationsList');
        if (!container) return;

        if (conversations.length === 0) {
            container.innerHTML = XSSProtection.sanitize(`
                <div class="no-conversations">
                    <p>No conversations yet</p>
                    <button class="btn-primary" onclick="window.inAppMessaging.showNewMessageModal()">
                        Start a conversation
                    </button>
                </div>
            `);
            return;
        }

        container.innerHTML = XSSProtection.sanitize(conversations.map(conv => {
            const otherParticipant = conv.participant_1 === this.currentUserId 
                ? conv.participant_2_user 
                : conv.participant_1_user;
            
            const lastMessage = conv.messages?.[0];
            const unreadCount = conv.messages?.filter(msg => 
                !msg.is_read && msg.sender_id !== this.currentUserId
            ).length || 0;

            return `
                <div class="conversation-item ${this.activeConversation === conv.id ? 'active' : ''}" 
                     onclick="window.inAppMessaging.openConversation('${conv.id}')">
                    <div class="conversation-avatar">
                        ${this.getAvatarForUserType(otherParticipant?.user_type)}
                    </div>
                    <div class="conversation-info">
                        <div class="conversation-name">${otherParticipant?.name || 'Unknown User'}</div>
                        <div class="conversation-preview">
                            ${lastMessage?.message_text?.substring(0, 50) || 'No messages yet'}
                        </div>
                        <div class="conversation-time">
                            ${lastMessage ? this.formatTime(lastMessage.created_at) : ''}
                        </div>
                    </div>
                    ${unreadCount > 0 ? `<div class="unread-badge">${unreadCount}</div>` : ''}
                </div>
            `;
        }).join(''));
    }

    getAvatarForUserType(userType) {
        const avatars = {
            'admin': '👨‍💼',
            'vendor': '🏪',
            'supplier': '📦',
            'field_agent': '🚶‍♂️',
            'supervisor': '👨‍💼'
        };
        return avatars[userType] || '👤';
    }

    async openConversation(conversationId) {
        try {
            this.activeConversation = conversationId;
            
            // Update UI to show active conversation
            document.querySelectorAll('.conversation-item').forEach(item => {
                item.classList.remove('active');
            });
            event.target.closest('.conversation-item')?.classList.add('active');

            // Load conversation details
            const { data: conversation } = await this.supabase
                .from('conversations')
                .select(`
                    *,
                    participant_1_user:users!conversations_participant_1_fkey(id, name, user_type),
                    participant_2_user:users!conversations_participant_2_fkey(id, name, user_type)
                `)
                .eq('id', conversationId)
                .single();

            if (!conversation) return;

            const otherParticipant = conversation.participant_1 === this.currentUserId 
                ? conversation.participant_2_user 
                : conversation.participant_1_user;

            // Update conversation header
            document.getElementById('conversationHeader').style.display = 'flex';
            document.getElementById('participantName').textContent = otherParticipant?.name || 'Unknown User';
            document.getElementById('participantStatus').textContent = 'online'; // Mock status

            // Load messages
            await this.loadMessages(conversationId);

            // Show message input
            document.getElementById('messageInputContainer').style.display = 'block';

            // Mark messages as read
            await this.markMessagesAsRead(conversationId);

        } catch (error) {
            console.error('Error opening conversation:', error);
        }
    }

    async loadMessages(conversationId) {
        try {
            const { data: messages } = await this.supabase
                .from('messages')
                .select(`
                    *,
                    sender:users(name, user_type)
                `)
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true });

            this.renderMessages(messages || []);
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }

    renderMessages(messages) {
        const container = document.getElementById('messagesContainer');
        if (!container) return;

        if (messages.length === 0) {
            container.innerHTML = XSSProtection.sanitize(`
                <div class="no-messages">
                    <p>No messages in this ...versation</p>
                    <p>Send a message to get started!</p>
                </div>
            `)
            return;
        }

        container.innerHTML = XSSProtection.sanitize(messages.map(message => {
            const isOwnMessage = message.sender_id === this.currentUserId;
            return `
                <div class="message ${isOwnMessage ? 'own-message' : 'other-message'}">
                    <div class="message-content">
                        <div class="message-text">${message.message_text}</div>
                        <div class="message-time">${this.formatTime(message.created_at)}</div>
                        ${message.attachment_url ? `
                            <div class="message-attachment">
                                <a href="${message.attachment_url}" target="_blank">📎 Attachment</a>
                            </div>
                        ` : ''}
                    </div>
                    ${isOwnMessage ? `
                        <div class="message-status">
                            ${message.is_read ? '✓✓' : '✓'}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join(''));

        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    }

    async sendMessage() {
        try {
            const messageInput = document.getElementById('messageInput');
            const messageText = messageInput.value.trim();

            if (!messageText || !this.activeConversation) return;

            // Insert message
            const { error } = await this.supabase
                .from('messages')
                .insert([{
                    conversation_id: this.activeConversation,
                    sender_id: this.currentUserId,
                    message_text: messageText,
                    message_type: 'text'
                }]);

            if (error) throw error;

            // Update conversation last_message_at
            await this.supabase
                .from('conversations')
                .update({ last_message_at: new Date().toISOString() })
                .eq('id', this.activeConversation);

            // Clear input
            messageInput.value = '';

            // Reload messages
            await this.loadMessages(this.activeConversation);
            await this.loadConversations();

            showUserMessage('Message sent', 'success');
        } catch (error) {
            console.error('Error sending message:', error);
            showUserMessage('Error sending message', 'error');
        }
    }

    async markMessagesAsRead(conversationId) {
        try {
            await this.supabase
                .from('messages')
                .update({ is_read: true })
                .eq('conversation_id', conversationId)
                .neq('sender_id', this.currentUserId);
        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
    }

    showNewMessageModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = XSSProtection.sanitize(`
            <div class="modal-content">
                <div class="modal-header">
  ...               <h2>💬 New Message</h2>
                    <button type="button" class="close">&times;</button>
                </div>
                <form onsubmit="event.preventDefault(); window.inAppMessaging.startNewConversation();">
                    <div class="form-group">
                        <label>Select Recipient</label>
                        <select id="messageRecipient" required>
                            <option value="">Choose recipient...</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Message</label>
                        <textarea id="newMessageText" placeholder="Type your message..." required></textarea>
                    </div>
                    <button type="submit" class="btn-submit">Send Message</button>
                </form>
            </div>
        `)

        document.body.appendChild(modal);
        modal.style.display = 'block';
        
        this.loadPotentialRecipients();
        
        modal.querySelector('.close').onclick = () => modal.remove();
    }

    async loadPotentialRecipients() {
        try {
            // Load all users except current user
            const { data: users } = await this.supabase
                .from('users')
                .select('id, name, user_type')
                .neq('id', this.currentUserId);

            const select = document.getElementById('messageRecipient');
            if (select && users) {
                users.forEach(user => {
                    const option = document.createElement('option');
                    option.value = user.id;
                    option.textContent = `${user.name} (${user.user_type})`;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading recipients:', error);
        }
    }

    async startNewConversation() {
        try {
            const recipientId = document.getElementById('messageRecipient').value;
            const messageText = document.getElementById('newMessageText').value;

            if (!recipientId || !messageText) return;

            // Check if conversation already exists
            const { data: existingConv } = await this.supabase
                .from('conversations')
                .select('id')
                .or(`and(participant_1.eq.${this.currentUserId},participant_2.eq.${recipientId}),and(participant_1.eq.${recipientId},participant_2.eq.${this.currentUserId})`)
                .single();

            let conversationId;

            if (existingConv) {
                conversationId = existingConv.id;
            } else {
                // Create new conversation
                const { data: newConv } = await this.supabase
                    .from('conversations')
                    .insert([{
                        participant_1: this.currentUserId,
                        participant_2: recipientId
                    }])
                    .select()
                    .single();

                conversationId = newConv.id;
            }

            // Send first message
            await this.supabase
                .from('messages')
                .insert([{
                    conversation_id: conversationId,
                    sender_id: this.currentUserId,
                    message_text: messageText,
                    message_type: 'text'
                }]);

            document.querySelector('.modal').remove();
            
            // Reload conversations and open the new one
            await this.loadConversations();
            await this.openConversation(conversationId);

            showUserMessage('Message sent successfully', 'success');
        } catch (error) {
            console.error('Error starting conversation:', error);
            showUserMessage('Error sending message', 'error');
        }
    }

    handleTyping() {
        // Implement typing indicator logic
        console.log('User is typing...');
    }

    showAttachmentOptions() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,application/pdf,.doc,.docx';
        input.onchange = (e) => this.handleFileAttachment(e.target.files[0]);
        input.click();
    }

    async handleFileAttachment(file) {
        if (!file) return;

        try {
            // Upload file to Supabase storage
            const fileName = `${Date.now()}_${file.name}`;
            const { data, error } = await this.supabase.storage
                .from('message-attachments')
                .upload(fileName, file);

            if (error) throw error;

            // Get public URL
            const { data: { publicUrl } } = this.supabase.storage
                .from('message-attachments')
                .getPublicUrl(fileName);

            // Send message with attachment
            await this.supabase
                .from('messages')
                .insert([{
                    conversation_id: this.activeConversation,
                    sender_id: this.currentUserId,
                    message_text: `Sent an attachment: ${file.name}`,
                    message_type: 'file',
                    attachment_url: publicUrl
                }]);

            await this.loadMessages(this.activeConversation);
            showUserMessage('File sent successfully', 'success');

        } catch (error) {
            console.error('Error uploading file:', error);
            showUserMessage('Error uploading file', 'error');
        }
    }

    searchConversations() {
        const searchTerm = document.getElementById('conversationSearch').value.toLowerCase();
        const conversations = document.querySelectorAll('.conversation-item');

        conversations.forEach(conv => {
            const name = conv.querySelector('.conversation-name').textContent.toLowerCase();
            const preview = conv.querySelector('.conversation-preview').textContent.toLowerCase();
            
            if (name.includes(searchTerm) || preview.includes(searchTerm)) {
                conv.style.display = 'flex';
            } else {
                conv.style.display = 'none';
            }
        });
    }

    startMessagePolling() {
        // Poll for new messages every 5 seconds
        this.messagePollingInterval = setInterval(async () => {
            if (this.activeConversation) {
                await this.loadMessages(this.activeConversation);
            }
            await this.loadConversations();
        }, 5000);
    }

    stopMessagePolling() {
        if (this.messagePollingInterval) {
            clearInterval(this.messagePollingInterval);
            this.messagePollingInterval = null;
        }
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString();
    }

    destroy() {
        this.stopMessagePolling();
    }
}

// Initialize in-app messaging
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('messagingContent')) {
        window.inAppMessaging = new InAppMessaging();
        window.inAppMessaging.init();
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (window.inAppMessaging) {
        window.inAppMessaging.destroy();
    }
});
