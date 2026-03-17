import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;
    const searchParams = request.nextUrl.searchParams;
    const conversationId = searchParams.get('conversationId');

    if (conversationId) {
      // Get messages for a specific conversation
      const [messages] = await db.query(
        `SELECT m.*, 
         s.name as senderName, s.email as senderEmail, s.image as senderImage,
         r.name as receiverName, r.email as receiverEmail, r.image as receiverImage,
         p.title as propertyTitle
         FROM messages m
         LEFT JOIN users s ON m.senderId = s.id
         LEFT JOIN users r ON m.receiverId = r.id
         LEFT JOIN properties p ON m.propertyId = p.id
         WHERE m.conversationId = ? 
         ORDER BY m.createdAt ASC`,
        [conversationId]
      ) as any[];

      // Mark messages as read if user is the receiver
      await db.query(
        'UPDATE messages SET `read` = TRUE WHERE conversationId = ? AND receiverId = ?',
        [conversationId, userId]
      );

      return NextResponse.json({ messages });
    } else {
      // Get all conversations for the user
      // Note: 'read' is a MySQL reserved keyword, so we escape it with backticks
      // Using String.fromCharCode(96) to represent backtick to avoid parsing issues
      const backtick = String.fromCharCode(96);
      const readColumn = backtick + 'read' + backtick;
      const [conversations] = await db.query(
        'SELECT DISTINCT ' +
         'm.conversationId, ' +
         'm.propertyId, ' +
         'CASE WHEN m.senderId = ? THEN m.receiverId ELSE m.senderId END as otherUserId, ' +
         'CASE WHEN m.senderId = ? THEN r.name ELSE s.name END as otherUserName, ' +
         'CASE WHEN m.senderId = ? THEN r.image ELSE s.image END as otherUserImage, ' +
         'p.title as propertyTitle, ' +
         'p.images as propertyImages, ' +
         '(SELECT message FROM messages m2 WHERE m2.conversationId = m.conversationId ORDER BY m2.createdAt DESC LIMIT 1) as lastMessage, ' +
         '(SELECT createdAt FROM messages m2 WHERE m2.conversationId = m.conversationId ORDER BY m2.createdAt DESC LIMIT 1) as lastMessageAt, ' +
         '(SELECT COUNT(*) FROM messages m2 WHERE m2.conversationId = m.conversationId AND m2.receiverId = ? AND m2.' + readColumn + ' = FALSE) as unreadCount ' +
         'FROM messages m ' +
         'LEFT JOIN users s ON m.senderId = s.id ' +
         'LEFT JOIN users r ON m.receiverId = r.id ' +
         'LEFT JOIN properties p ON m.propertyId = p.id ' +
         'WHERE m.senderId = ? OR m.receiverId = ? ' +
         'ORDER BY lastMessageAt DESC',
        [userId, userId, userId, userId, userId, userId]
      ) as any[];

      // Format conversations
      const formattedConversations = conversations.map((conv: any) => ({
        conversationId: conv.conversationId,
        propertyId: conv.propertyId,
        propertyTitle: conv.propertyTitle,
        propertyImages: typeof conv.propertyImages === 'string' ? JSON.parse(conv.propertyImages) : conv.propertyImages,
        otherUserId: conv.otherUserId,
        otherUserName: conv.otherUserName,
        otherUserImage: conv.otherUserImage,
        lastMessage: conv.lastMessage,
        lastMessageAt: conv.lastMessageAt,
        unreadCount: conv.unreadCount || 0,
      }));

      return NextResponse.json({ conversations: formattedConversations });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch messages', message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const senderId = (session.user as any).id;
    const { receiverId, propertyId, message } = await request.json();

    if (!receiverId || !propertyId || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get property owner
    const [properties] = await db.query(
      'SELECT userId FROM properties WHERE id = ?',
      [propertyId]
    ) as any[];

    if (properties.length === 0) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    const propertyOwnerId = properties[0].userId;
    const senderIsOwner = senderId === propertyOwnerId;
    const receiverIsOwner = receiverId === propertyOwnerId;

    // Check if there's an existing conversation for this property between these users
    // Check in both directions since we need to find conversations regardless of who initiated
    let [existingConversations] = await db.query(
      `SELECT id, buyerId, sellerId FROM conversations 
       WHERE propertyId = ? 
       AND ((buyerId = ? AND sellerId = ?) OR (buyerId = ? AND sellerId = ?))`,
      [propertyId, senderId, receiverId, receiverId, senderId]
    ) as any[];

    const hasExistingConversation = existingConversations.length > 0;

    // Also check if there are any existing messages between these users for this property
    // This helps catch cases where conversation exists but query might have missed it
    let [existingMessages] = await db.query(
      `SELECT DISTINCT conversationId FROM messages 
       WHERE propertyId = ? 
       AND ((senderId = ? AND receiverId = ?) OR (senderId = ? AND receiverId = ?))
       LIMIT 1`,
      [propertyId, senderId, receiverId, receiverId, senderId]
    ) as any[];

    const hasExistingMessages = existingMessages.length > 0;

    // Validation logic:
    // Allow messaging if:
    // 1. Receiver is the property owner (buyers can message owners)
    // 2. Sender is the property owner (owners can reply)
    // 3. There's an existing conversation or messages (both parties can continue conversation)
    // Block: Random users messaging each other about properties they don't own
    const canSendMessage = receiverIsOwner || senderIsOwner || hasExistingConversation || hasExistingMessages;
    
    if (!canSendMessage) {
      return NextResponse.json(
        { error: 'You can only message the property owner' },
        { status: 403 }
      );
    }

    // Determine buyer and seller roles
    let buyerId: string;
    let sellerId: string;
    let conversationId: string | null = null;
    
    if (hasExistingConversation) {
      // Use roles from existing conversation
      const conv = existingConversations[0];
      buyerId = conv.buyerId;
      sellerId = conv.sellerId;
      conversationId = conv.id;
    } else if (hasExistingMessages) {
      // Found existing messages but no conversation record - get conversation from message
      conversationId = existingMessages[0].conversationId;
      
      // Get the conversation details to determine buyer/seller
      let [convFromMessage] = await db.query(
        'SELECT buyerId, sellerId FROM conversations WHERE id = ?',
        [conversationId]
      ) as any[];
      
      if (convFromMessage.length > 0) {
        buyerId = convFromMessage[0].buyerId;
        sellerId = convFromMessage[0].sellerId;
      } else {
        // Fallback: determine roles from property owner
        buyerId = senderIsOwner ? receiverId : senderId;
        sellerId = propertyOwnerId;
      }
    } else {
      // New conversation - sender is buyer, receiver is seller (property owner)
      buyerId = senderId;
      sellerId = receiverId;
    }
    
    // Find or get the conversation
    let conversations: any[] = [];
    if (conversationId) {
      // We already have the conversation ID
      conversations = [{ id: conversationId }];
    } else {
      // Look up conversation
      [conversations] = await db.query(
        `SELECT id FROM conversations 
         WHERE propertyId = ? AND buyerId = ? AND sellerId = ?`,
        [propertyId, buyerId, sellerId]
      ) as any[];
    }

    if (conversations.length === 0) {
      // Create new conversation
      conversationId = crypto.randomUUID();
      await db.query(
        'INSERT INTO conversations (id, propertyId, buyerId, sellerId) VALUES (?, ?, ?, ?)',
        [conversationId, propertyId, buyerId, sellerId]
      );
    } else {
      conversationId = conversations[0].id;
      // Update conversation timestamp
      await db.query(
        'UPDATE conversations SET lastMessageAt = NOW() WHERE id = ?',
        [conversationId]
      );
    }

    // Create message
    const messageId = crypto.randomUUID();
    await db.query(
      `INSERT INTO messages (id, conversationId, senderId, receiverId, propertyId, message) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [messageId, conversationId, senderId, receiverId, propertyId, message]
    );

    // Get the created message with user details
    const [newMessages] = await db.query(
      `SELECT m.*, 
       s.name as senderName, s.email as senderEmail, s.image as senderImage,
       r.name as receiverName, r.email as receiverEmail, r.image as receiverImage,
       p.title as propertyTitle
       FROM messages m
       LEFT JOIN users s ON m.senderId = s.id
       LEFT JOIN users r ON m.receiverId = r.id
       LEFT JOIN properties p ON m.propertyId = p.id
       WHERE m.id = ?`,
      [messageId]
    ) as any[];

    return NextResponse.json({ message: newMessages[0], conversationId }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to send message', message: error.message },
      { status: 500 }
    );
  }
}

