import { Module } from '@nestjs/common';
import { ProjectsController } from './controllers/projects.controller';
import { ProjectsService } from './services/projects.service';
import { ProjectsRepository } from '../../database/repositories/projects.repository';
import { TasksController } from './controllers/tasks.controller';
import { TasksService } from './services/tasks.service';
import { TasksRepository } from '../../database/repositories/tasks.repository';

@Module({
  controllers: [ProjectsController, TasksController],
  providers: [ProjectsService, ProjectsRepository, TasksService, TasksRepository],
  exports: [ProjectsService, TasksService],
})
export class ProjectsModule {}
