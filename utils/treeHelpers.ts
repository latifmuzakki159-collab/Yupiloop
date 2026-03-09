import { Message } from '../types';

export const linearToTree = (messages: Message[]): Message[] => {
  if (!messages || messages.length === 0) return [];

  const treeMessages: Message[] = [];
  let currentParentId: string | null = null;
  const mainBranchId = 'main';

  for (let i = 0; i < messages.length; i++) {
    const msg = { ...messages[i] };
    
    // If it already has tree structure, just keep it
    if (msg.parentId !== undefined && msg.childrenIds !== undefined) {
      treeMessages.push(msg);
      currentParentId = msg.id;
      continue;
    }

    // Convert linear to tree
    msg.parentId = currentParentId;
    msg.childrenIds = [];
    msg.branchId = mainBranchId;

    // Link from parent if parent exists and is in treeMessages
    if (currentParentId) {
        const parent = treeMessages.find(m => m.id === currentParentId);
        if (parent && !parent.childrenIds?.includes(msg.id)) {
            parent.childrenIds = parent.childrenIds || [];
            parent.childrenIds.push(msg.id);
        }
    }

    treeMessages.push(msg);
    currentParentId = msg.id;
  }

  return treeMessages;
};

export const getBranchPath = (messages: Message[], leafId: string): Message[] => {
  const path: Message[] = [];
  let currentId: string | null = leafId;
  const messageMap = new Map(messages.map(m => [m.id, m]));

  while (currentId) {
    const msg = messageMap.get(currentId);
    if (!msg) break;
    path.unshift(msg);
    currentId = msg.parentId || null;
  }

  return path;
};

export const findLeafNodes = (messages: Message[]): Message[] => {
  return messages.filter(m => !m.childrenIds || m.childrenIds.length === 0);
};
