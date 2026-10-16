import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { sendContactEmail } from '../lib/mail';

export const submitContact = async (req: Request, res: Response) => {
  try {
    const { name, email, message, _gotcha, website_url } = req.body;

    // Silent Honeypot Trap: If automated bot filled in hidden honeypot fields,
    // respond with success immediately without saving to DB or sending email.
    if (_gotcha || website_url) {
      return res.status(201).json({ message: 'Message sent successfully' });
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const cleanName = name.trim().slice(0, 100);
    const cleanEmail = email.trim().toLowerCase().slice(0, 150);
    const cleanMessage = message.trim().slice(0, 2000);

    const contactMessage = await prisma.contactMessage.create({
      data: {
        name: cleanName,
        email: cleanEmail,
        message: cleanMessage,
      },
    });

    try {
      await sendContactEmail({ name: cleanName, email: cleanEmail, message: cleanMessage });
    } catch (mailError) {
      console.error('Failed to send contact email:', mailError);
    }

    res.status(201).json({ message: 'Message sent successfully', contactMessage });
  } catch (error) {
    console.error('Error submitting contact form:', error);
    res.status(500).json({ error: 'Failed to submit message' });
  }
};
