import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  private readonly startTime = Date.now();

  getHello() {
    const uptimeMs = Date.now() - this.startTime;
    const uptimeSec = Math.floor(uptimeMs / 1000);

    return {
      status: 'ok',
      uptime: `${uptimeSec}s`,
    };
  }
}
