import { Router } from 'express';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
// Import your SMS provider library or mock logic here if needed.

const router = Router();

router.post('/incoming', async (req, res) => {
  const { from, body } = req.body;
  if (!from || !body) {
    return res.status(400).json({ error: 'Missing from or body in SMS' });
  }

  // Attempt to find the user by phone number. Assuming we might search by some identifier or email later.
  // Since 'users' schema doesn't have a phone field yet, we fallback to general role for now.
  let role = 'general';
  
  // Example of how we might look up a user if they had a phone field:
  // const user = await db.select().from(users).where(eq(users.phone, from)).limit(1);
  // if (user.length > 0) role = user[0].role;

  // Simple mock resolution for demonstration:
  if (from === '+919999999991') role = 'fisherman';
  else if (from === '+919999999992') role = 'researcher';
  else if (from === '+919999999993') role = 'coastal_guard';

  console.log(`[SMS Gateway] Received SMS from ${from}. Detected role: ${role}`);
  console.log(`[SMS Gateway] Message: ${body}`);

  let responseMessage = 'Message received. We are processing your request.';

  // Role-based response logic
  switch (role) {
    case 'fisherman':
      responseMessage = 'ORCA (Fisherman): Your query has been logged. Safe fishing.';
      break;
    case 'researcher':
      responseMessage = 'ORCA (Research): Data request logged. Analysis pending.';
      break;
    case 'coastal_guard':
      responseMessage = 'ORCA (Ops): Incident logged. Standing by for updates.';
      break;
    default:
      responseMessage = 'ORCA: Request received.';
  }

  // In a real scenario, this is where you'd dispatch the response back via the Android Gateway.
  res.status(200).json({ status: 'success', response: responseMessage });
});

export const smsRoutes = router;
