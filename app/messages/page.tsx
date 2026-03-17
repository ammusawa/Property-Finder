'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import { showToast } from '@/components/Toast';

interface Conversation {
  conversationId: string;
  propertyId: string;
  propertyTitle: string;
  propertyImages: string[];
  otherUserId: string;
  otherUserName: string;
  otherUserImage: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  propertyId: string;
  message: string;
  read: boolean;
  createdAt: string;
  senderName: string;
  receiverName: string;
  propertyTitle: string;
}

export default function MessagesPage() {
  const { data: session, status } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchConversations();
    } else if (status === 'unauthenticated') {
      window.location.href = '/auth/signin';
    }
  }, [status]);

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/messages');
      if (!response.ok) throw new Error('Failed to fetch conversations');
      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (error) {
      // Error fetching conversations
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/messages?conversationId=${conversationId}`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      const data = await response.json();
      setMessages(data.messages || []);
      // Refresh conversations to update unread counts
      fetchConversations();
    } catch (error) {
      // Error fetching messages
    }
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    fetchMessages(conversation.conversationId);
    setNewMessage('');
  };

  const handleSendMessage = async () => {
    if (!selectedConversation || !newMessage.trim()) return;

    setSending(true);
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: selectedConversation.otherUserId,
          propertyId: selectedConversation.propertyId,
          message: newMessage.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send message');
      }

      const data = await response.json();
      // Add the new message to the messages list
      setMessages([...messages, data.message]);
      setNewMessage('');
      // Refresh conversations to update last message
      fetchConversations();
      showToast('Message sent successfully', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to send message', 'error');
    } finally {
      setSending(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  if (status === 'loading' || loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading messages...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-4">
            <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
            <p className="text-sm text-gray-600 mt-1">Communicate with property owners and buyers</p>
          </div>

          <div className="flex h-[600px]">
            {/* Conversations List */}
            <div className="w-1/3 border-r border-gray-200 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <p>No conversations yet</p>
                  <p className="text-sm mt-2">Start messaging by contacting a property owner</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {conversations.map((conv) => (
                    <button
                      key={conv.conversationId}
                      onClick={() => handleSelectConversation(conv)}
                      className={`w-full p-4 text-left hover:bg-gray-50 transition ${
                        selectedConversation?.conversationId === conv.conversationId
                          ? 'bg-green-50 border-l-4 border-green-600'
                          : ''
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          {conv.propertyImages && conv.propertyImages.length > 0 ? (
                            conv.propertyImages[0].startsWith('data:') ? (
                              <img
                                src={conv.propertyImages[0]}
                                alt={conv.propertyTitle}
                                className="w-12 h-12 rounded-lg object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = 'https://via.placeholder.com/48x48?text=No+Image';
                                  target.onerror = null;
                                }}
                              />
                            ) : (
                              <Image
                                src={conv.propertyImages[0]}
                                alt={conv.propertyTitle}
                                width={48}
                                height={48}
                                className="rounded-lg object-cover"
                              />
                            )
                          ) : (
                            <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                              <span className="text-gray-400 text-xs">No Image</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {conv.otherUserName}
                            </p>
                            {conv.unreadCount > 0 && (
                              <span className="flex-shrink-0 bg-green-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                {conv.unreadCount}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate mt-1">
                            {conv.propertyTitle}
                          </p>
                          <p className="text-xs text-gray-600 truncate mt-1">
                            {conv.lastMessage}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDate(conv.lastMessageAt)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Messages View */}
            <div className="flex-1 flex flex-col">
              {selectedConversation ? (
                <>
                  {/* Header */}
                  <div className="border-b border-gray-200 px-6 py-4 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {selectedConversation.otherUserImage ? (
                          <Image
                            src={selectedConversation.otherUserImage}
                            alt={selectedConversation.otherUserName}
                            width={40}
                            height={40}
                            className="rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                            <span className="text-gray-600 text-sm font-semibold">
                              {selectedConversation.otherUserName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {selectedConversation.otherUserName}
                          </h3>
                          <Link
                            href={`/properties/${selectedConversation.propertyId}`}
                            className="text-sm text-green-600 hover:underline"
                          >
                            {selectedConversation.propertyTitle}
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
                    {messages.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        <p>No messages yet. Start the conversation!</p>
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isSent = msg.senderId === (session?.user as any)?.id;
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-lg px-4 py-2 ${
                                isSent
                                  ? 'bg-green-600 text-white'
                                  : 'bg-white text-gray-900 border border-gray-200'
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                              <p
                                className={`text-xs mt-1 ${
                                  isSent ? 'text-green-100' : 'text-gray-500'
                                }`}
                              >
                                {formatDate(msg.createdAt)}
                                {isSent && msg.read && (
                                  <span className="ml-2">✓✓</span>
                                )}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Message Input */}
                  <div className="border-t border-gray-200 px-6 py-4 bg-white">
                    <div className="flex space-x-4">
                      <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        placeholder="Type your message..."
                        rows={2}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || sending}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {sending ? 'Sending...' : 'Send'}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center bg-gray-50">
                  <div className="text-center text-gray-500">
                    <p className="text-lg font-semibold">Select a conversation</p>
                    <p className="text-sm mt-2">Choose a conversation from the list to start messaging</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

