import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../database/base.repository';
import { Project } from '../../../database/entities/project.entity';

@Injectable()
export class ProjectsRepository extends BaseRepository<Project> {
  constructor() {
    super(Project);
  }
}
