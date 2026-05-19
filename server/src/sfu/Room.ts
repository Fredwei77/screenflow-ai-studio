import { types as mediasoupTypes } from 'mediasoup';
import { getRouter } from './mediasoupServer.js';
import { serverConfig } from '../config.js';

export interface PeerInfo {
  userId: string;
  userName: string;
  socketId: string;
}

interface PeerState {
  info: PeerInfo;
  sendTransport: mediasoupTypes.WebRtcTransport | null;
  recvTransport: mediasoupTypes.WebRtcTransport | null;
  producers: Map<string, mediasoupTypes.Producer>; // key: producer.id
  consumers: Map<string, mediasoupTypes.Consumer>; // key: consumer.id
}

/**
 * Manages a single mediasoup room with peers, transports, producers, and consumers.
 * One Room per meetingId. Each peer gets a send transport and a recv transport.
 */
export class Room {
  public readonly meetingId: string;
  public readonly router: mediasoupTypes.Router;
  private peers = new Map<string, PeerState>(); // key: socketId

  private constructor(meetingId: string, router: mediasoupTypes.Router) {
    this.meetingId = meetingId;
    this.router = router;
  }

  /**
   * Create or get a Room for the given meetingId.
   */
  static async create(meetingId: string): Promise<Room> {
    const router = await getRouter(meetingId);
    return new Room(meetingId, router);
  }

  /**
   * Add a peer to the room.
   */
  addPeer(info: PeerInfo): void {
    if (this.peers.has(info.socketId)) {
      console.warn(`[Room ${this.meetingId}] Peer ${info.userId} (${info.socketId}) already exists`);
      return;
    }
    this.peers.set(info.socketId, {
      info,
      sendTransport: null,
      recvTransport: null,
      producers: new Map(),
      consumers: new Map(),
    });
    console.log(`[Room ${this.meetingId}] Peer added: ${info.userId} (${info.socketId}), total: ${this.peers.size}`);
  }

  /**
   * Remove a peer and clean up all their transports, producers, and consumers.
   */
  removePeer(socketId: string): PeerInfo | null {
    const peer = this.peers.get(socketId);
    if (!peer) return null;

    // Close all producers
    for (const producer of peer.producers.values()) {
      if (!producer.closed) producer.close();
    }
    // Close all consumers
    for (const consumer of peer.consumers.values()) {
      if (!consumer.closed) consumer.close();
    }
    // Close transports
    if (peer.sendTransport && !peer.sendTransport.closed) peer.sendTransport.close();
    if (peer.recvTransport && !peer.recvTransport.closed) peer.recvTransport.close();

    this.peers.delete(socketId);
    console.log(`[Room ${this.meetingId}] Peer removed: ${peer.info.userId} (${socketId}), remaining: ${this.peers.size}`);
    return peer.info;
  }

  /**
   * Create a WebRTC transport for sending (produce) or receiving (consume).
   */
  async createWebRtcTransport(socketId: string, direction: 'send' | 'recv'): Promise<mediasoupTypes.WebRtcTransport> {
    const peer = this.peers.get(socketId);
    if (!peer) throw new Error(`Peer ${socketId} not found in room ${this.meetingId}`);

    const { listenIps, initialAvailableOutgoingBitrate, maxIncomingBitrate } = serverConfig.sfu.webRtcTransport;

    const transport = await this.router.createWebRtcTransport({
      listenIps,
      initialAvailableOutgoingBitrate,
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
    });

    transport.on('dtlsstatechange', (state) => {
      if (state === 'closed' || state === 'failed') {
        console.warn(`[Room ${this.meetingId}] Transport ${direction} DTLS ${state} for ${peer.info.userId}`);
      }
    });

    transport.observer.on('close', () => {
      console.log(`[Room ${this.meetingId}] Transport ${direction} closed for ${peer.info.userId}`);
    });

    if (direction === 'send') {
      peer.sendTransport = transport;
    } else {
      peer.recvTransport = transport;
    }

    console.log(`[Room ${this.meetingId}] Transport ${direction} created for ${peer.info.userId} [id:${transport.id}]`);
    return transport;
  }

  /**
   * Connect a transport with the client's DTLS parameters.
   */
  async connectTransport(socketId: string, transportId: string, dtlsParameters: mediasoupTypes.DtlsParameters): Promise<void> {
    const peer = this.peers.get(socketId);
    if (!peer) throw new Error(`Peer ${socketId} not found`);

    const transport = this.findTransport(peer, transportId);
    if (!transport) throw new Error(`Transport ${transportId} not found for peer ${socketId}`);

    await transport.connect({ dtlsParameters });
    console.log(`[Room ${this.meetingId}] Transport ${transportId} connected for ${peer.info.userId}`);
  }

  /**
   * Produce media (audio or video) on the send transport.
   */
  async produce(
    socketId: string,
    transportId: string,
    kind: mediasoupTypes.MediaKind,
    rtpParameters: mediasoupTypes.RtpParameters,
    appData: Record<string, unknown> = {}
  ): Promise<{ producerId: string; peer: PeerInfo }> {
    const peer = this.peers.get(socketId);
    if (!peer) throw new Error(`Peer ${socketId} not found`);
    if (!peer.sendTransport || peer.sendTransport.id !== transportId) {
      throw new Error(`Send transport ${transportId} not found for peer ${socketId}`);
    }

    const producer = await peer.sendTransport.produce({
      kind,
      rtpParameters,
      appData: { ...appData, peerId: socketId, userId: peer.info.userId },
    });

    peer.producers.set(producer.id, producer);

    producer.observer.on('close', () => {
      console.log(`[Room ${this.meetingId}] Producer closed: ${producer.id} (${kind}) from ${peer.info.userId}`);
      peer.producers.delete(producer.id);
      // Notify all other peers that this producer is gone
      this.notifyProducerClosed(socketId, producer.id);
    });

    console.log(`[Room ${this.meetingId}] Producer created: ${producer.id} (${kind}) from ${peer.info.userId}`);

    // Notify all other peers about this new producer
    this.notifyNewProducer(socketId, producer.id, kind, peer.info);

    return { producerId: producer.id, peer: peer.info };
  }

  /**
   * Consume a remote producer (receive media from another peer).
   */
  async consume(
    socketId: string,
    transportId: string,
    producerId: string,
    rtpCapabilities: mediasoupTypes.RtpCapabilities
  ): Promise<{
    consumerId: string;
    producerId: string;
    kind: mediasoupTypes.MediaKind;
    rtpParameters: mediasoupTypes.RtpParameters;
    peer: PeerInfo;
  } | null> {
    const peer = this.peers.get(socketId);
    if (!peer) throw new Error(`Peer ${socketId} not found`);
    if (!peer.recvTransport || peer.recvTransport.id !== transportId) {
      throw new Error(`Recv transport ${transportId} not found for peer ${socketId}`);
    }

    // Check if the router can consume this producer
    if (!this.router.canConsume({ producerId, rtpCapabilities })) {
      console.warn(`[Room ${this.meetingId}] Cannot consume producer ${producerId} — incompatible RTP capabilities`);
      return null;
    }

    const consumer = await peer.recvTransport.consume({
      producerId,
      rtpCapabilities,
      paused: true, // Start paused, client will resume after setting up
    });

    peer.consumers.set(consumer.id, consumer);

    consumer.observer.on('close', () => {
      console.log(`[Room ${this.meetingId}] Consumer closed: ${consumer.id}`);
      peer.consumers.delete(consumer.id);
    });

    // Find the producer's owner
    const producerOwner = this.findProducerOwner(producerId);

    console.log(`[Room ${this.meetingId}] Consumer created: ${consumer.id} for producer ${producerId} (${consumer.kind}) by ${peer.info.userId}`);

    // Return full rtpParameters but with problematic fields cleaned
    const cleanRtpParameters = JSON.parse(JSON.stringify(consumer.rtpParameters));

    // Remove all encodings and rebuild with single minimal encoding
    // This avoids "Duplicate a=msid lines" in Chrome's SDP parser
    cleanRtpParameters.encodings = [{ ssrc: 1000000 + Math.floor(Math.random() * 1000000) }];

    return {
      consumerId: consumer.id,
      producerId,
      kind: consumer.kind,
      rtpParameters: cleanRtpParameters,
      peer: producerOwner || { userId: 'unknown', userName: 'Unknown', socketId: '' },
    };
  }

  /**
   * Resume a paused consumer.
   */
  async resumeConsumer(socketId: string, consumerId: string): Promise<void> {
    const peer = this.peers.get(socketId);
    if (!peer) throw new Error(`Peer ${socketId} not found`);

    const consumer = peer.consumers.get(consumerId);
    if (!consumer) throw new Error(`Consumer ${consumerId} not found for peer ${socketId}`);

    await consumer.resume();
    console.log(`[Room ${this.meetingId}] Consumer resumed: ${consumerId} for ${peer.info.userId}`);
  }

  /**
   * Pause a producer (e.g., when user mutes camera/mic).
   */
  pauseProducer(socketId: string, producerId: string): void {
    const peer = this.peers.get(socketId);
    if (!peer) return;

    const producer = peer.producers.get(producerId);
    if (!producer) return;

    producer.pause();
    console.log(`[Room ${this.meetingId}] Producer paused: ${producerId} (${producer.kind})`);
  }

  /**
   * Resume a paused producer.
   */
  resumeProducer(socketId: string, producerId: string): void {
    const peer = this.peers.get(socketId);
    if (!peer) return;

    const producer = peer.producers.get(producerId);
    if (!producer) return;

    producer.resume();
    console.log(`[Room ${this.meetingId}] Producer resumed: ${producerId} (${producer.kind})`);
  }

  /**
   * Replace a producer's track (e.g., for screen sharing).
   */
  async replaceProducerTrack(socketId: string, producerId: string, track: mediasoupTypes.AppData): Promise<void> {
    // Note: mediasoup's replaceTrack is on the transport sender level,
    // but for simplicity, we close the old producer and create a new one.
    // The client will handle this via the produce/consume flow.
    console.log(`[Room ${this.meetingId}] Track replacement requested for producer ${producerId}`);
  }

  /**
   * Get all existing producers (for a newly joining peer to consume).
   */
  getExistingProducers(): Array<{ producerId: string; peer: PeerInfo; kind: mediasoupTypes.MediaKind }> {
    const result: Array<{ producerId: string; peer: PeerInfo; kind: mediasoupTypes.MediaKind }> = [];
    for (const [socketId, peer] of this.peers) {
      for (const [producerId, producer] of peer.producers) {
        if (!producer.closed) {
          result.push({ producerId, peer: peer.info, kind: producer.kind });
        }
      }
    }
    return result;
  }

  /**
   * Get the number of peers in the room.
   */
  get peerCount(): number {
    return this.peers.size;
  }

  /**
   * Get all peer info.
   */
  getPeers(): PeerInfo[] {
    return Array.from(this.peers.values()).map((p) => p.info);
  }

  /**
   * Close the entire room and all its resources.
   */
  close(): void {
    for (const peer of this.peers.values()) {
      for (const producer of peer.producers.values()) {
        if (!producer.closed) producer.close();
      }
      for (const consumer of peer.consumers.values()) {
        if (!consumer.closed) consumer.close();
      }
      if (peer.sendTransport && !peer.sendTransport.closed) peer.sendTransport.close();
      if (peer.recvTransport && !peer.recvTransport.closed) peer.recvTransport.close();
    }
    this.peers.clear();
    if (!this.router.closed) this.router.close();
    console.log(`[Room ${this.meetingId}] Room closed`);
  }

  // --- Private helpers ---

  private findTransport(peer: PeerState, transportId: string): mediasoupTypes.WebRtcTransport | null {
    if (peer.sendTransport && peer.sendTransport.id === transportId) return peer.sendTransport;
    if (peer.recvTransport && peer.recvTransport.id === transportId) return peer.recvTransport;
    return null;
  }

  private findProducerOwner(producerId: string): PeerInfo | null {
    for (const peer of this.peers.values()) {
      if (peer.producers.has(producerId)) {
        return peer.info;
      }
    }
    return null;
  }

  // These methods need a reference to the socket.io server to emit events.
  // We'll set up a callback-based notification system.
  private onNewProducer: ((targetSocketId: string, producerId: string, kind: string, peer: PeerInfo) => void) | null = null;
  private onProducerClosed: ((targetSocketId: string, producerId: string) => void) | null = null;
  private onConsumerClosed: ((targetSocketId: string, consumerId: string, producerId: string) => void) | null = null;

  /**
   * Set notification callbacks for socket.io event emission.
   */
  setNotificationHandlers(handlers: {
    onNewProducer: (targetSocketId: string, producerId: string, kind: string, peer: PeerInfo) => void;
    onProducerClosed: (targetSocketId: string, producerId: string) => void;
    onConsumerClosed: (targetSocketId: string, consumerId: string, producerId: string) => void;
  }): void {
    this.onNewProducer = handlers.onNewProducer;
    this.onProducerClosed = handlers.onProducerClosed;
    this.onConsumerClosed = handlers.onConsumerClosed;
  }

  private notifyNewProducer(fromSocketId: string, producerId: string, kind: string, peer: PeerInfo): void {
    if (!this.onNewProducer) {
      console.log(`[Room ${this.meetingId}] notifyNewProducer: no handler set`);
      return;
    }
    for (const [socketId] of this.peers) {
      if (socketId !== fromSocketId) {
        console.log(`[Room ${this.meetingId}] Emitting newProducer to ${socketId} for ${producerId} (${kind})`);
        this.onNewProducer(socketId, producerId, kind, peer);
      }
    }
  }

  private notifyProducerClosed(fromSocketId: string, producerId: string): void {
    if (!this.onProducerClosed) return;
    for (const [socketId] of this.peers) {
      if (socketId !== fromSocketId) {
        this.onProducerClosed(socketId, producerId);
      }
    }
  }

  private notifyConsumerClosed(targetSocketId: string, consumerId: string, producerId: string): void {
    if (!this.onConsumerClosed) return;
    this.onConsumerClosed(targetSocketId, consumerId, producerId);
  }
}
