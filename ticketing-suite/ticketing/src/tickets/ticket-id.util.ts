import { Prisma } from '@prisma/client';

const LETTER_FALLBACK = 'SITE';

export function deriveSitePrefix(name: string): string {
  if (!name) return LETTER_FALLBACK;
  const letters = name.replace(/[^A-Za-z]/g, '').toUpperCase();
  const base = (letters || LETTER_FALLBACK).padEnd(4, 'X');
  return base.slice(0, 4);
}

export function formatTicketId(prefix: string, sequenceNumber: number): string {
  return `${prefix}${sequenceNumber.toString().padStart(5, '0')}`;
}

type SequenceResult = {
  prefix: string;
  nextValue: number;
};

async function incrementSequence(
  tx: Prisma.TransactionClient,
  siteId: string
): Promise<SequenceResult> {
  return tx.siteTicketSequence.update({
    where: { siteId },
    data: { nextValue: { increment: 1 } },
    select: { prefix: true, nextValue: true },
  });
}

export async function allocateTicketId(
  tx: Prisma.TransactionClient,
  tenantId: string,
  site: { id: string; name: string }
): Promise<{ id: string; sequenceNumber: number; prefix: string }> {
  // Try up to 5 times to allocate a unique ID
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const updated = await incrementSequence(tx, site.id);
      const sequenceNumber = updated.nextValue - 1;
      const ticketId = formatTicketId(updated.prefix, sequenceNumber);
      
      // Check if this ID already exists
      const existing = await tx.ticket.findUnique({
        where: { id: ticketId },
        select: { id: true }
      });
      
      if (!existing) {
        return {
          id: ticketId,
          sequenceNumber,
          prefix: updated.prefix,
        };
      }
      
      // ID exists, continue to next attempt
      console.warn(`Ticket ID ${ticketId} already exists, retrying...`);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        const prefix = deriveSitePrefix(site.name);
        try {
          await tx.siteTicketSequence.create({
            data: {
              tenantId,
              siteId: site.id,
              prefix,
              nextValue: 2,
            },
          });
          return {
            id: formatTicketId(prefix, 1),
            sequenceNumber: 1,
            prefix,
          };
        } catch (createErr) {
          if (
            createErr instanceof Prisma.PrismaClientKnownRequestError &&
            createErr.code === 'P2002'
          ) {
            const retry = await incrementSequence(tx, site.id);
            const sequenceNumber = retry.nextValue - 1;
            return {
              id: formatTicketId(retry.prefix, sequenceNumber),
              sequenceNumber,
              prefix: retry.prefix,
            };
          }
          throw createErr;
        }
      }
      throw err;
    }
  }
  
  throw new Error('Failed to allocate unique ticket ID after 5 attempts');
}

