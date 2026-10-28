import type { SupabaseClient } from '@supabase/supabase-js';

export interface FriendChallenge {
  id: string;
  name: string;
  is_owner: boolean;
  invite_code: string | null;
  invite_expires_at: string | null;
  member_count: number;
}

export interface FriendBoardRow {
  nickname: string;
  progress_bp: number;
  saved_cents: number | null; // null : le membre ne partage pas son montant
  is_me: boolean;
}

/** Appels aux fonctions SQL sécurisées (voir supabase/migrations) ; aucune donnée fictive. */
export function friendsService(client: SupabaseClient) {
  const call = async <T>(fn: string, args?: Record<string, unknown>): Promise<T> => {
    const { data, error } = await client.rpc(fn, args);
    if (error) throw error;
    return data as T;
  };
  return {
    list: () => call<FriendChallenge[]>('list_my_friend_challenges'),
    board: (id: string) => call<FriendBoardRow[]>('get_friend_board', { p_challenge_id: id }),
    create: (name: string, nickname: string) => call<string>('create_friend_challenge', { p_name: name, p_nickname: nickname }),
    join: (code: string, nickname: string) => call<string>('join_friend_challenge', { p_code: code, p_nickname: nickname }),
    leave: (id: string) => call<void>('leave_friend_challenge', { p_challenge_id: id }),
    renewInvite: (id: string) => call<string>('renew_friend_invite', { p_challenge_id: id }),
    updateProgress: (id: string, progressBp: number, savedCents: number, shareAmount: boolean) =>
      call<void>('update_my_friend_progress', {
        p_challenge_id: id,
        p_progress_bp: progressBp,
        p_saved_cents: savedCents,
        p_share_amount: shareAmount,
      }),
  };
}
