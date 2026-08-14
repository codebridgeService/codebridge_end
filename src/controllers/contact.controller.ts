import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { sendContactEmail } from '../lib/mail';

export const submitContact = async (req: Request, res: Response) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    const contactMessage = await prisma.contactMessage.create({
      data: { name, email, message },
    });
    try {
      await sendContactEmail({ name, email, message });
    } catch (mailError) {
      console.error('Failed to send contact email:', mailError);
    }
    res.status(201).json({ message: 'Message sent successfully', contactMessage });
  } catch (error) {
    console.error('Error submitting contact form:', error);
    res.status(500).json({ error: 'Failed to submit message' });
  }
};
