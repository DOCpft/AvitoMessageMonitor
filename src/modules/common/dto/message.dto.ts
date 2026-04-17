/**
 * Data Transfer Object for creating a message
 */
export class CreateMessageDto {
  id!: string;
  sender!: string;
  text!: string;
  timestamp!: Date;
}

/**
 * Data Transfer Object for message response
 */
export class MessageResponseDto {
  id!: string;
  sender!: string;
  text!: string;
  timestamp!: Date;
  isNew?: boolean;
}

/**
 * Data Transfer Object for WebSocket message events
 */
export class WebSocketMessageDto {
  event!: string;
  data!: CreateMessageDto;
}