import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { Project } from '../entities/project.entity';

@Injectable()
export class ProjectsRepository extends BaseRepository<Project> {
  constructor() {
    super(Project);
  }
}
