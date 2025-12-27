export interface Admin {
	id: string;
	email: string;
	created_at: string;
	updated_at: string;
}

export interface Game {
	id: string;
	admin_id: string;
	token: string;
	created_at: string;
	updated_at: string;
}

export interface Team {
	id: string;
	game_id: string;
	name: string;
	color: string; // Hex format
	created_at: string;
}

export interface Participant {
	id: string;
	game_id: string;
	team_id: string | null;
	name: string;
	avatar_seed: string | null;
	is_online: boolean;
	last_seen: string;
	joined_at: string;
}

export interface Round {
	id: string;
	game_id: string;
	status: "waiting" | "in_progress" | "completed";
	countdown_duration: number | null; // milliseconds
	started_at: string | null;
	completed_at: string | null;
	created_at: string;
}

export interface RoundParticipant {
	id: string;
	round_id: string;
	participant_id: string;
	added_at: string;
}

export interface RoundResult {
	id: string;
	round_id: string;
	participant_id: string;
	reaction_time: number | null; // milliseconds
	was_eliminated: boolean;
	is_winner: boolean;
	recorded_at: string;
}

// Extended types with relations
export interface ParticipantWithTeam extends Participant {
	team?: Team;
}

export interface RoundWithParticipants extends Round {
	participants: Participant[];
}

export interface RoundWithResults extends Round {
	results: RoundResult[];
}

export interface GameWithDetails extends Game {
	admin: Admin;
	participants: ParticipantWithTeam[];
	teams: Team[];
	rounds: Round[];
}
