// Build the Vapi "create call" request for each lead that should be dialled.
// Used by both the instant speed-to-lead path and the morning queue.
const CFG = {
  assistantId: '__VAPI_ASSISTANT_ID__',
  phoneNumberId: '__VAPI_PHONE_NUMBER_ID__',
  assistantName: '__ASSISTANT_NAME__',
  agentName: '__AGENT_NAME__',
};

return $input.all().map(({ json }) => {
  const lead = json.lead || json;
  const firstName = json.firstName || String(lead.name || '').split(' ')[0] || '';
  return {
    json: {
      lead,
      vapiCall: {
        assistantId: CFG.assistantId,
        phoneNumberId: CFG.phoneNumberId,
        customer: { number: lead.phone, ...(lead.name ? { name: lead.name } : {}) },
        metadata: { leadSource: lead.source || '' },
        assistantOverrides: {
          firstMessage:
            `Hi${firstName ? ' ' + firstName : ''}, it's ${CFG.assistantName}, ${CFG.agentName}'s AI assistant. ` +
            'You just reached out to us about a home. Do you have a quick minute?',
          variableValues: {
            firstName,
            // Non-empty leadSource is what tells the prompt this is an outbound call.
            leadSource: lead.source || 'our website',
            leadInterest: lead.interest || '',
          },
        },
      },
    },
  };
});
