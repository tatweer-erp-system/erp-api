import { Module } from '@nestjs/common';
import { ProjectsController } from './projects/projects.controller';
import { ProjectsService } from './projects/projects.service';
import { ProjectsRepository } from './projects/projects.repository';
import { TasksController } from './tasks/tasks.controller';
import { TasksService } from './tasks/tasks.service';
import { TasksRepository } from './tasks/tasks.repository';

@Module({
  controllers: [ProjectsController, TasksController],
  providers: [ProjectsService, ProjectsRepository, TasksService, TasksRepository],
  exports: [ProjectsService, TasksService],
})
export class ProjectsModule {}
